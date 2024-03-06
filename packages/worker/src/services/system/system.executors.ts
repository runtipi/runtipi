import fs from 'fs';
import si from 'systeminformation';
import * as Sentry from '@sentry/node';
import { logger } from '@/lib/logger';

export class SystemExecutors {
  private readonly logger;

  constructor() {
    this.logger = logger;
  }

  private handleSystemError = (err: unknown) => {
    Sentry.captureException(err);

    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false as const, message: err.message };
    }
    this.logger.error(`An error occurred: ${err}`);

    return { success: false as const, message: `An error occurred: ${String(err)}` };
  };

  public getSystemLoad = async () => {
    try {
      const { currentLoad } = await si.currentLoad();

      const memResult = { total: 0, used: 0, available: 0 };

      try {
        const memInfo = await fs.promises.readFile('/mnt/host/meminfo');

        memResult.total = Number(memInfo.toString().match(/MemTotal:\s+(\d+)/)?.[1] ?? 0) * 1024;
        memResult.available = Number(memInfo.toString().match(/MemAvailable:\s+(\d+)/)?.[1] ?? 0) * 1024;
        memResult.used = memResult.total - memResult.available;
      } catch (e) {
        this.logger.error(`Unable to read /mnt/host/meminfo: ${e}`);
      }

      const [disk0] = await si.fsSize();

      const disk = disk0 ?? { available: 0, size: 0 };
      const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
      const diskSize = Math.round(disk.size / 1024 / 1024 / 1024);
      const diskUsed = diskSize - diskFree;
      const percentUsed = Math.round((diskUsed / diskSize) * 100);

      const memoryTotal = Math.round(Number(memResult.total) / 1024 / 1024 / 1024);
      const memoryFree = Math.round(Number(memResult.available) / 1024 / 1024 / 1024);
      const percentUsedMemory = Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100);

      return { success: true as const, data: { diskUsed, diskSize, percentUsed, cpuLoad: currentLoad, memoryTotal, percentUsedMemory } };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
