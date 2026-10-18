import fs from 'node:fs';
import os from 'node:os';
import { pLimit } from '@/common/helpers/file-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type Dockerode from 'dockerode';
import { DOCKERODE } from '../docker/docker.module';
import { CgroupReader, isServedByLxcfs } from './metrics/cgroup';
import { getUsedMemory, parseMeminfo } from './metrics/meminfo';

const HOST_MEMINFO_PATH = '/host/proc/meminfo';
const HOST_CGROUP_PATH = '/host/sys/fs/cgroup';
const MOUNTINFO_PATH = '/proc/self/mountinfo';

// Summing container memory queries docker for each container, don't do it on every request
const CONTAINERS_CACHE_MS = 10_000;

export type MemorySource = 'host' | 'cgroup' | 'containers';

export type HostMemory = {
  used: number;
  total: number;
  source: MemorySource;
};

const readFileOrNull = async (filePath: string) => {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
};

/**
 * Reads the memory usage of the machine runtipi runs on.
 *
 * On a regular host or VM, /proc/meminfo is used. Inside an LXC container, /proc/meminfo is served by
 * lxcfs which reports the memory of the cgroup of the *reading* process: from the runtipi container it
 * only shows runtipi's own usage. In that case the LXC cgroup is read when /sys/fs/cgroup is mounted,
 * otherwise usage is estimated from the memory of all running Docker containers.
 */
@Injectable()
export class HostMemoryService implements OnModuleInit {
  private readonly cgroup: CgroupReader;
  private isLxc = false;
  private hasCgroupMount = false;
  private containersCache: { value: number; at: number } | null = null;

  constructor(
    private readonly logger: LoggerService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {
    this.cgroup = new CgroupReader(HOST_CGROUP_PATH, (filePath) => this.readFile(filePath));
  }

  protected readFile(filePath: string) {
    return readFileOrNull(filePath);
  }

  async onModuleInit() {
    this.isLxc = isServedByLxcfs(await this.readFile(MOUNTINFO_PATH), HOST_MEMINFO_PATH);
    // Only trust the cgroup inside LXC, on a cgroup v1 host the root cgroup also exposes memory files
    this.hasCgroupMount = this.isLxc && (await this.cgroup.getMemory()) !== null;

    if (this.isLxc && !this.hasCgroupMount) {
      this.logger.warn(
        `Runtipi is running inside an LXC container. Memory usage is estimated from Docker containers. Mount /sys/fs/cgroup to ${HOST_CGROUP_PATH} for accurate values.`,
      );
    }
  }

  /**
   * @param containersMemory - Memory used by all containers, when the caller already measured it
   */
  public async getMemory(containersMemory?: number): Promise<HostMemory> {
    const meminfoContent = await this.readFile(HOST_MEMINFO_PATH);
    const meminfo = parseMeminfo(meminfoContent ?? '');
    const total = meminfo.total || os.totalmem();

    if (this.hasCgroupMount) {
      const cgroupMemory = await this.cgroup.getMemory();
      if (cgroupMemory) {
        const limitedTotal = cgroupMemory.limit ? Math.min(cgroupMemory.limit, total) : total;
        return { used: Math.min(cgroupMemory.used, limitedTotal), total: limitedTotal, source: 'cgroup' };
      }
    }

    if (this.isLxc) {
      return { used: Math.min(containersMemory ?? (await this.getContainersMemory()), total), total, source: 'containers' };
    }

    if (!meminfoContent) {
      this.logger.error(`Unable to read ${HOST_MEMINFO_PATH}`);
      return { used: os.totalmem() - os.freemem(), total: os.totalmem(), source: 'host' };
    }

    return { used: getUsedMemory(meminfo), total, source: 'host' };
  }

  /**
   * Sum of the memory used by all running containers, computed like `docker stats`.
   */
  private async getContainersMemory() {
    if (this.containersCache && Date.now() - this.containersCache.at < CONTAINERS_CACHE_MS) {
      return this.containersCache.value;
    }

    let total = 0;
    try {
      const containers = await this.docker.listContainers({ filters: { status: ['running'] } });
      const limit = pLimit(5);

      await Promise.all(
        containers.map((container) =>
          limit(async () => {
            try {
              const stats = await this.docker.getContainer(container.Id).stats({ stream: false, 'one-shot': true });
              const memStat = (stats.memory_stats?.stats ?? {}) as Record<string, number | undefined>;
              const inactiveFile = memStat.inactive_file ?? memStat.total_inactive_file ?? 0;
              total += Math.max((stats.memory_stats?.usage ?? 0) - inactiveFile, 0);
            } catch {
              // The container may have stopped between listing and reading its stats
            }
          }),
        ),
      );
    } catch (e) {
      this.logger.debug('Unable to read container memory usage:', e);
    }

    this.containersCache = { value: total, at: Date.now() };
    return total;
  }
}
