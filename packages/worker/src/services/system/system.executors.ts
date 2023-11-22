import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import { logger } from '@/lib/logger';
import { ROOT_FOLDER } from '@/config/constants';

export class SystemExecutors {
  private readonly logger;

  constructor() {
    this.logger = logger;
  }

  private handleSystemError = (err: unknown) => {
    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }
    this.logger.error(`An error occurred: ${err}`);

    return { success: false, message: `An error occurred: ${err}` };
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

    return {
      cpu: { load: currentLoad },
      memory: memResult,
      disk: { total: disk0?.size, used: disk0?.used, available: disk0?.available },
    };
  };

  public systemInfo = async () => {
    try {
      const systemLoad = await this.getSystemLoad();

      await fs.promises.writeFile(path.join(ROOT_FOLDER, 'state', 'system-info.json'), JSON.stringify(systemLoad, null, 2));
      await fs.promises.chmod(path.join(ROOT_FOLDER, 'state', 'system-info.json'), 0o777);

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
