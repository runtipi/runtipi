import fs from 'node:fs';
import * as Sentry from '@sentry/node';
import si from 'systeminformation';
import { getEnv } from '@/lib/environment';
import { execAsync, type ILogger } from '@runtipi/shared/node';
import { inject, injectable } from 'inversify';

export interface ISystemExecutors {
  getSystemLoad: () => Promise<
    | {
        success: true;
        data: { diskUsed: number; diskSize: number; percentUsed: number; cpuLoad: number; memoryTotal: number; percentUsedMemory: number };
      }
    | { success: false; message: string }
  >;
  execSysCommandNohup: (command: string, useRootFolder: boolean) => Promise<{ success: boolean; message: string }>;
}

@injectable()
export class SystemExecutors implements ISystemExecutors {
  constructor(@inject('ILogger') private logger: ILogger) {}

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

      return { success: true as const, data: { diskUsed, diskSize, percentUsed, cpuLoad: currentLoad, memoryTotal, percentUsedMemory } };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public execSysCommandNohup = async (command: string, useRootFolder = true) => {
    try {
      const { rootFolderHost } = getEnv();

      const execCommand = `
        nsenter -m -u -i -n -p -t 1 bash -c '
          nohup bash -c "
            ${useRootFolder ? `cd ${rootFolderHost}` : ''}
            ${command}
          " &> ${rootFolderHost}/logs/exec-sys-command.log &
        '
      `;

      const { stdout, stderr } = await execAsync(execCommand);

      if (stderr) {
        throw stderr;
      }

      return { success: true, message: stdout };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
