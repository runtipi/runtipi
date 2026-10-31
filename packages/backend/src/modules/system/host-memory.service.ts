import fs from 'node:fs';
import os from 'node:os';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type Dockerode from 'dockerode';
import { DOCKERODE } from '../docker/docker.constants';
import { isServedByLxcfs, readCgroupMemory } from './metrics/cgroup';
import { ContainerMemoryReader } from './metrics/container-memory';
import { clamp, getUsedMemory, parseMeminfo } from './metrics/meminfo';

const HOST_MEMINFO_PATH = '/host/proc/meminfo';
const HOST_CGROUP_PATH = '/host/sys/fs/cgroup';

export type HostMemory = {
  used: number;
  total: number;
  source: 'host' | 'cgroup' | 'containers';
};

const readFileOrNull = async (filePath: string) => {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
};

@Injectable()
export class HostMemoryService {
  private readonly containers: ContainerMemoryReader;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    @Inject(DOCKERODE) docker: Dockerode,
  ) {
    this.containers = new ContainerMemoryReader(docker);
  }

  public async getMemory(): Promise<HostMemory> {
    const [meminfoContent, mountinfo] = await Promise.all([readFileOrNull(HOST_MEMINFO_PATH), readFileOrNull('/proc/self/mountinfo')]);
    const meminfo = parseMeminfo(meminfoContent ?? '');

    if (!isServedByLxcfs(mountinfo, HOST_MEMINFO_PATH)) {
      if (meminfo.total > 0) {
        return { used: getUsedMemory(meminfo), total: meminfo.total, source: 'host' };
      }

      this.logger.error(`Unable to read memory accounting from ${HOST_MEMINFO_PATH}`);
      const total = os.totalmem();

      return { used: total - os.freemem(), total, source: 'host' };
    }

    const hostTotal = this.config.get('hostMemoryTotal');
    const cgroup = await readCgroupMemory(HOST_CGROUP_PATH, readFileOrNull);
    let total = hostTotal || cgroup?.limit || meminfo.total || os.totalmem();

    if (cgroup) {
      if (cgroup.limit !== null) {
        total = Math.min(total, cgroup.limit);
      }

      return { used: clamp(cgroup.used, 0, total), total, source: 'cgroup' };
    }

    try {
      const used = await this.containers.getMemory();

      return { used: clamp(used, 0, total), total, source: 'containers' };
    } catch (error) {
      this.logger.error('Unable to read container memory usage:', error);
      throw new ServiceUnavailableException('Memory usage is temporarily unavailable');
    }
  }
}
