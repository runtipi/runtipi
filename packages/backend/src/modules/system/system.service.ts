import os from 'node:os';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable } from '@nestjs/common';
import type Dockerode from 'dockerode';
import si from 'systeminformation';
import { DOCKERODE } from '../docker/docker.module';
import { AppDiskUsageService } from './app-disk-usage.service';
import { SAMPLE_INTERVAL_MS, SystemMetricsService } from './system-metrics.service';

const GB = 1024 ** 3;

const toPercent = (used: number, total: number) => (total > 0 ? Math.round((used / total) * 1000) / 10 : 0);

@Injectable()
export class SystemService {
  private staticInfo: Promise<{
    hostname: string;
    os: string;
    kernel: string;
    architecture: string;
    dockerVersion: string;
    cpuModel: string;
  }> | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly metrics: SystemMetricsService,
    private readonly appDiskUsage: AppDiskUsageService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {}

  public async getSystemLoad() {
    const sample = await this.metrics.getLatest();

    const disks = sample?.disks ?? [];
    const mainDisk = disks.find((disk) => disk.mount === '/') ?? disks[0];
    const diskSize = Math.round((mainDisk?.size ?? 0) / GB);
    const diskUsed = Math.round((mainDisk?.used ?? 0) / GB);

    const memoryTotal = sample?.memoryTotal ?? 0;
    const memoryUsed = sample?.memoryUsed ?? 0;

    return {
      diskUsed,
      diskSize,
      percentUsed: mainDisk ? toPercent(mainDisk.used, mainDisk.size) : 0,
      cpuLoad: sample?.cpu ?? 0,
      memoryTotal: Math.round(memoryTotal / GB),
      // Computed from bytes, rounding to GB first made small usage show as 0%
      percentUsedMemory: toPercent(memoryUsed, memoryTotal),
      memoryUsedBytes: memoryUsed,
      memoryTotalBytes: memoryTotal,
      memorySource: sample?.memorySource ?? 'host',
      cpuTemperature: sample?.cpuTemperature ?? null,
      networkRxBytesPerSec: sample?.rxBytesPerSec ?? 0,
      networkTxBytesPerSec: sample?.txBytesPerSec ?? 0,
      disks: disks.map((disk) => ({ ...disk, percentUsed: toPercent(disk.used, disk.size) })),
      timestamp: sample?.timestamp ?? Date.now(),
    };
  }

  public async getSystemInfo() {
    if (!this.staticInfo) {
      this.staticInfo = this.readStaticInfo();
    }
    const info = await this.staticInfo;

    return {
      ...info,
      cpuCores: os.availableParallelism(),
      uptime: Math.round(os.uptime()),
    };
  }

  private async readStaticInfo() {
    const [dockerInfo, cpu] = await Promise.all([
      this.docker.info().catch((e) => {
        this.logger.debug('Unable to read docker info:', e);
        return null;
      }),
      si.cpu().catch(() => null),
    ]);

    // Docker info describes the host, os/si would only describe the runtipi container
    return {
      hostname: dockerInfo?.Name ?? os.hostname(),
      os: dockerInfo?.OperatingSystem ?? os.type(),
      kernel: dockerInfo?.KernelVersion ?? os.release(),
      architecture: dockerInfo?.Architecture ?? os.arch(),
      dockerVersion: dockerInfo?.ServerVersion ?? '',
      cpuModel: cpu ? `${cpu.manufacturer} ${cpu.brand}`.trim() : '',
    };
  }

  public getHistory() {
    const history = this.metrics.getHistory();

    // Columnar format keeps the payload small
    return {
      interval: SAMPLE_INTERVAL_MS,
      timestamps: history.map((s) => s.timestamp),
      cpu: history.map((s) => round(s.cpu)),
      memory: history.map((s) => round(toPercent(s.memoryUsed, s.memoryTotal))),
      networkRx: history.map((s) => Math.round(s.rxBytesPerSec)),
      networkTx: history.map((s) => Math.round(s.txBytesPerSec)),
    };
  }

  public getAppsUsage() {
    const disk = this.appDiskUsage.get();
    const running = this.metrics.getApps();
    const runningIds = new Set(running.map((app) => app.id));

    // Stopped apps have no containers but still use disk space
    const stopped = [...(disk?.apps.keys() ?? [])]
      .filter((id) => !runningIds.has(id))
      .map((id) => ({ id, containers: 0, cpu: 0, memory: 0, rxBytesPerSec: 0, txBytesPerSec: 0, history: [] }));

    return {
      interval: SAMPLE_INTERVAL_MS,
      diskMeasuredAt: disk?.measuredAt ?? null,
      apps: [...running, ...stopped].map((app) => ({
        id: app.id,
        containers: app.containers,
        cpu: round(app.cpu),
        memory: app.memory,
        networkRx: Math.round(app.rxBytesPerSec),
        networkTx: Math.round(app.txBytesPerSec),
        disk: disk?.apps.get(app.id) ?? null,
        history: {
          timestamps: app.history.map((h) => h.timestamp),
          cpu: app.history.map((h) => round(h.cpu)),
          memory: app.history.map((h) => h.memory),
        },
      })),
      sharedStorage: disk?.shared ?? [],
    };
  }

  public async getLocalCertificate() {
    const { dataDir } = this.config.get('directories');
    const filePath = `${dataDir}/traefik/tls/cert.pem`;

    if (await this.filesystem.isFile(filePath)) {
      const file = await this.filesystem.readTextFile(filePath);
      return file;
    }
  }
}

const round = (value: number) => Math.round(value * 100) / 100;
