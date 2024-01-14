import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import * as Sentry from '@sentry/node';
import { logger } from '@/lib/logger';
import { ROOT_FOLDER } from '@/config/constants';
import { SocketManager } from '../../lib/socket/SocketManager';

export class SystemExecutors {
  private readonly logger;

  private cacheTime: number;

  private cacheTimeout: number;

  constructor(cacheTimeout = 15000) {
    this.logger = logger;
    this.cacheTime = 0;
    this.cacheTimeout = cacheTimeout;
  }

  private handleSystemError = (err: unknown) => {
    Sentry.captureException(err);

    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }
    this.logger.error(`An error occurred: ${err}`);

    return { success: false, message: `An error occurred: ${String(err)}` };
  };

  private getSystemLoad = async () => {
    const { currentLoad } = await si.currentLoad();

    const memResult = { total: 0, used: 0, available: 0 };

    try {
      const memInfo = await fs.promises.readFile('/host/proc/meminfo');

      memResult.total = Number(memInfo.toString().match(/MemTotal:\s+(\d+)/)?.[1] ?? 0) * 1024;
      memResult.available = Number(memInfo.toString().match(/MemAvailable:\s+(\d+)/)?.[1] ?? 0) * 1024;
      memResult.used = memResult.total - memResult.available;
    } catch (e) {
      this.logger.error(`Unable to read /host/proc/meminfo: ${e}`);
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

    return { diskUsed, diskSize, percentUsed, cpuLoad: currentLoad, memoryTotal, percentUsedMemory };
  };

  public systemInfo = async () => {
    try {
      const now = Date.now();
      const systemLoad = await this.getSystemLoad();

      SocketManager.emit({ type: 'system_info', event: 'status_change', data: systemLoad });

      if (now - this.cacheTime > this.cacheTimeout) {
        await fs.promises.writeFile(path.join(ROOT_FOLDER, 'state', 'system-info.json'), JSON.stringify(systemLoad, null, 2));
        this.cacheTime = Date.now();
      }

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
