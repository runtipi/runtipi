import fs from 'fs';
import si from 'systeminformation';
import * as Sentry from '@sentry/node';
import { logger } from '@/lib/logger';
import { SocketManager } from '@/lib/socket/SocketManager';

export class SystemExecutors {
  private readonly logger;

  constructor() {
    this.logger = logger;
  }

  private handleSystemError = (err: unknown) => {
    Sentry.captureException(err);

    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }
    this.logger.error(`An error occurred: ${err}`);

    return { success: false, message: `An error occurred: ${err}` };
  };

  private getSystemLoad = async () => {
    const { currentLoad } = await si.currentLoad();

    const info = { cpu: { load: 0 }, disk: { total: 0, used: 0, available: 0 }, memory: { total: 0, used: 0, available: 0 } };
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

    info.cpu.load = currentLoad;
    info.disk.total = disk0?.size || 0;
    info.disk.used = disk0?.used || 0;
    info.disk.available = disk0?.available || 0;
    info.memory = memResult;

    return info;
  };

  public systemInfo = async () => {
    try {
      const info = await this.getSystemLoad();

      SocketManager.emit({ type: 'system_info', event: 'status_change', data: { info } });
      return { success: true, message: '' };
    } catch (e) {
      SocketManager.emit({
        type: 'system_info',
        event: 'status_change_error',
        data: { info: { cpu: { load: 0 }, disk: { total: 0, used: 0, available: 0 }, memory: { total: 0, used: 0, available: 0 } } },
      });
      return this.handleSystemError(e);
    }
  };
}
