import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { Injectable } from '@nestjs/common';
import si from 'systeminformation';
import { HostMemoryService } from './host-memory.service';

@Injectable()
export class SystemService {
  constructor(
    private readonly config: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly hostMemory: HostMemoryService,
  ) {}

  public async getSystemLoad() {
    const [{ currentLoad }, memory, [disk0]] = await Promise.all([si.currentLoad(), this.hostMemory.getMemory(), si.fsSize()]);

    const disk = disk0 ?? { available: 0, size: 0 };
    const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
    const diskSize = Math.round(disk.size / 1024 / 1024 / 1024);
    const diskUsed = diskSize - diskFree;
    const percentUsed = Math.round((diskUsed / diskSize) * 100);

    const memoryTotal = Math.round(memory.total / 1024 / 1024 / 1024);
    // Computed from bytes, rounding to GB first made low usage show as 0%
    const percentUsedMemory = memory.total > 0 ? Math.round((memory.used / memory.total) * 1000) / 10 : 0;

    return {
      diskUsed: diskUsed || 0,
      diskSize: diskSize || 0,
      percentUsed: percentUsed || 0,
      cpuLoad: currentLoad || 0,
      memoryTotal: memoryTotal || 0,
      percentUsedMemory: percentUsedMemory || 0,
      memorySource: memory.source,
    };
  }

  public async getLocalCertificate() {
    const { dataDir } = this.config.get('directories');
    const filePath = `${dataDir}/traefik/tls/ca.pem`;

    if (await this.filesystem.isFile(filePath)) {
      const file = await this.filesystem.readTextFile(filePath);
      return file;
    }
  }
}
