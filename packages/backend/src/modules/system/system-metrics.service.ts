import os from 'node:os';
import { pLimit } from '@/common/helpers/file-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type Dockerode from 'dockerode';
import si from 'systeminformation';
import { DOCKERODE } from '../docker/docker.module';
import { HostMemoryService, type MemorySource } from './host-memory.service';
import { type ContainerSample, computeContainerRates, toContainerSample } from './metrics/container-stats';
import { RingBuffer } from './metrics/ring-buffer';

export const SAMPLE_INTERVAL_MS = 10_000;
export const HISTORY_DURATION_MS = 60 * 60 * 1000;
const HISTORY_SIZE = HISTORY_DURATION_MS / SAMPLE_INTERVAL_MS;

export const RUNTIPI_GROUP = 'runtipi';
export const OTHER_GROUP = 'other';

export type SystemSample = {
  timestamp: number;
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  memorySource: MemorySource;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  cpuTemperature: number | null;
  disks: Disk[];
};

export type Disk = {
  fs: string;
  mount: string;
  type: string;
  size: number;
  used: number;
  available: number;
};

export type AppUsage = {
  id: string;
  containers: number;
  cpu: number;
  memory: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  history: { timestamp: number; cpu: number; memory: number }[];
};

type ContainerUsage = { cpu: number; memory: number; rxBytesPerSec: number; txBytesPerSec: number };

// Pseudo filesystems and files bind mounted into the container, not real disks
const IGNORED_FS_TYPES = ['tmpfs', 'devtmpfs', 'squashfs', 'proc', 'sysfs', 'nsfs', 'fuse.lxcfs'];
// Docker internals, visible when runtipi is not running in a container
const IGNORED_MOUNT_PREFIXES = ['/var/lib/docker', '/run/', '/var/run/'];
const MIN_DISK_SIZE = 1024 ** 3;

/**
 * Periodically samples system and per-app resource usage and keeps a short history in memory.
 * Sampling in the background (instead of on each request) keeps CPU measurements stable when
 * several clients poll the dashboard, and is what makes the history sparklines possible.
 */
@Injectable()
export class SystemMetricsService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private sampling: Promise<void> | null = null;

  private temperatureSupported = true;

  private readonly history = new RingBuffer<SystemSample>(HISTORY_SIZE);
  private readonly prevContainerSamples = new Map<string, ContainerSample>();
  private readonly appHistory = new Map<string, RingBuffer<{ timestamp: number; cpu: number; memory: number }>>();
  private apps: AppUsage[] = [];

  constructor(
    private readonly logger: LoggerService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
    private readonly hostMemory: HostMemoryService,
  ) {}

  onModuleInit() {
    // Don't block startup on the first sample
    void this.sample();
    this.timer = setInterval(() => void this.sample(), SAMPLE_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Latest system sample. Takes a sample right away if none was taken yet.
   */
  public async getLatest(): Promise<SystemSample | undefined> {
    if (!this.history.size) {
      await this.sample();
    }
    return this.history.last();
  }

  public getHistory() {
    return this.history.toArray();
  }

  public getApps() {
    return this.apps;
  }

  /**
   * Take a sample, or wait for the one in progress if a sample is already running.
   */
  public sample(): Promise<void> {
    if (!this.sampling) {
      this.sampling = this.takeSample()
        .catch((e) => this.logger.error('Unable to sample system metrics:', e))
        .finally(() => {
          this.sampling = null;
        });
    }
    return this.sampling;
  }

  private async takeSample() {
    const timestamp = Date.now();
    const cpus = os.availableParallelism();

    const [containers, disks, cpuTemperature] = await Promise.all([this.sampleContainers(cpus), this.getDisks(), this.getCpuTemperature()]);

    const containersTotal = [...containers.values()].reduce(
      (acc, usage) => ({
        cpu: acc.cpu + usage.cpu,
        memory: acc.memory + usage.memory,
        rxBytesPerSec: acc.rxBytesPerSec + usage.rxBytesPerSec,
        txBytesPerSec: acc.txBytesPerSec + usage.txBytesPerSec,
      }),
      { cpu: 0, memory: 0, rxBytesPerSec: 0, txBytesPerSec: 0 },
    );

    // Containers were just sampled, reuse their memory if it is needed as an estimate (LXC without cgroup mount)
    const memory = await this.hostMemory.getMemory(containersTotal.memory);

    const { currentLoad } = await si.currentLoad();

    this.history.push({
      timestamp,
      cpu: currentLoad || 0,
      memoryUsed: memory.used,
      memoryTotal: memory.total,
      memorySource: memory.source,
      rxBytesPerSec: containersTotal.rxBytesPerSec,
      txBytesPerSec: containersTotal.txBytesPerSec,
      cpuTemperature,
      disks,
    });

    this.updateApps(timestamp, containers);
  }

  /**
   * Sample all running containers and group their usage by app.
   */
  private async sampleContainers(cpus: number): Promise<Map<string, ContainerUsage & { containers: number }>> {
    const groups = new Map<string, ContainerUsage & { containers: number }>();

    let containers: Dockerode.ContainerInfo[];
    try {
      containers = await this.docker.listContainers({ filters: { status: ['running'] } });
    } catch (e) {
      this.logger.debug('Unable to list containers for metrics:', e);
      return groups;
    }

    const limit = pLimit(5);
    const seen = new Set<string>();

    await Promise.all(
      containers.map((container) =>
        limit(async () => {
          try {
            const stats = await this.docker.getContainer(container.Id).stats({ stream: false, 'one-shot': true });
            const sample = toContainerSample(stats);
            const prev = this.prevContainerSamples.get(container.Id);
            const rates = prev ? computeContainerRates(prev, sample, cpus) : null;

            seen.add(container.Id);
            this.prevContainerSamples.set(container.Id, sample);

            const groupId = getContainerGroup(container);
            const group = groups.get(groupId) ?? { cpu: 0, memory: 0, rxBytesPerSec: 0, txBytesPerSec: 0, containers: 0 };

            group.containers += 1;
            group.memory += sample.memoryUsed;
            group.cpu += rates?.cpu ?? 0;
            group.rxBytesPerSec += rates?.rxBytesPerSec ?? 0;
            group.txBytesPerSec += rates?.txBytesPerSec ?? 0;
            groups.set(groupId, group);
          } catch (e) {
            // The container may have stopped between listing and reading its stats
            this.logger.debug(`Unable to read stats of container ${container.Id}:`, e);
          }
        }),
      ),
    );

    for (const id of this.prevContainerSamples.keys()) {
      if (!seen.has(id)) this.prevContainerSamples.delete(id);
    }

    return groups;
  }

  private updateApps(timestamp: number, groups: Map<string, ContainerUsage & { containers: number }>) {
    for (const id of this.appHistory.keys()) {
      if (!groups.has(id)) this.appHistory.delete(id);
    }

    this.apps = [...groups.entries()]
      .map(([id, usage]) => {
        const history = this.appHistory.get(id) ?? new RingBuffer(HISTORY_SIZE);
        history.push({ timestamp, cpu: usage.cpu, memory: usage.memory });
        this.appHistory.set(id, history);

        return { id, ...usage, history: history.toArray() };
      })
      .sort((a, b) => b.memory - a.memory);
  }

  private async getDisks(): Promise<Disk[]> {
    try {
      const filesystems = await si.fsSize();
      const disks = new Map<string, Disk>();

      for (const disk of filesystems) {
        if (disk.size < MIN_DISK_SIZE || IGNORED_FS_TYPES.includes(disk.type)) continue;
        if (IGNORED_MOUNT_PREFIXES.some((prefix) => disk.mount.startsWith(prefix))) continue;

        // The same filesystem appears once per bind mount, keep the root mount or the first one
        const existing = disks.get(disk.fs);
        if (existing && (existing.mount === '/' || disk.mount !== '/')) continue;

        disks.set(disk.fs, {
          fs: disk.fs,
          mount: disk.mount,
          type: disk.type,
          size: disk.size,
          used: Math.max(disk.size - disk.available, 0),
          available: disk.available,
        });
      }

      return [...disks.values()].sort((a, b) => (a.mount === '/' ? -1 : b.mount === '/' ? 1 : a.mount.localeCompare(b.mount)));
    } catch (e) {
      this.logger.debug('Unable to read disks:', e);
      return [];
    }
  }

  private async getCpuTemperature() {
    if (!this.temperatureSupported) return null;

    try {
      const { main } = await si.cpuTemperature();
      if (typeof main === 'number' && main > 0) return main;
    } catch {
      // ignore
    }

    // Avoid probing sensors every sample on systems that don't expose them
    this.temperatureSupported = false;
    return null;
  }
}

export const getContainerGroup = (container: Pick<Dockerode.ContainerInfo, 'Labels' | 'Names'>) => {
  const appUrn = container.Labels?.['runtipi.appurn'];
  if (appUrn) return appUrn;

  const project = container.Labels?.['com.docker.compose.project'];
  const name = container.Names?.[0]?.replace(/^\//, '') ?? '';
  if (project === 'runtipi' || name.startsWith('runtipi')) return RUNTIPI_GROUP;

  return OTHER_GROUP;
};
