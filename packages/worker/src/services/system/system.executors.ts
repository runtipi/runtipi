import fs from 'fs';
import si from 'systeminformation';
import * as Sentry from '@sentry/node';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/environment';
import Docker from 'dockerode';
import * as jwt from 'jsonwebtoken';

export class SystemExecutors {
  private readonly logger;
  private readonly docker;

  constructor() {
    this.logger = logger;
    this.docker = new Docker({
      socketPath: '/var/run/docker.sock',
    });
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
        const memInfo = await fs.promises.readFile('/host/proc/meminfo');

        memResult.total = Number(memInfo.toString().match(/MemTotal:\s+(\d+)/)?.[1] ?? 0) * 1024;
        memResult.available =
          Number(memInfo.toString().match(/MemAvailable:\s+(\d+)/)?.[1] ?? 0) * 1024;
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

      return {
        success: true as const,
        data: {
          diskUsed,
          diskSize,
          percentUsed,
          cpuLoad: currentLoad,
          memoryTotal,
          percentUsedMemory,
        },
      };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public launchEventHandlerContainer = async () => {
    try {
      const { rootFolderHost, tipiVersion, jwtSecret } = getEnv();

      this.logger.info('Deleting old events handler container...');
      try {
        await this.docker.getContainer('runtipi-events-handler').remove({ force: true });
      } catch (e) {
        this.logger.warn(
          "Failed to remove old runtipi-events-handler container, probably doesn't exist",
        );
      }

      if (process.env.NODE_ENV !== 'development') {
        this.logger.info('Pulling events handler image...');
        await this.docker.createImage({
          fromImage: `runtipi/events-handler:${tipiVersion}`,
        });
      }

      this.logger.info('Creating events handler container...');
      await this.docker.createContainer({
        name: 'runtipi-events-handler',
        Image:
          process.env.NODE_ENV === 'development'
            ? 'runtipi/events-handler:development'
            : `runtipi/events-handler:${tipiVersion}`,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Env: [
          `ROOT_FOLDER_HOST=${rootFolderHost}`,
          `NODE_ENV=${process.env.NODE_ENV}`,
          `JWT_SECRET=${jwtSecret}`,
        ],
        HostConfig: {
          Binds: [
            `${rootFolderHost}:${rootFolderHost}`,
            '/var/run/docker.sock:/var/run/docker.sock:ro',
            process.env.NODE_ENV === 'development'
              ? `${rootFolderHost}/packages/events-handler/src:/app/packages/events-handler/src`
              : '',
          ],
          NetworkMode: 'runtipi_tipi_main_network',
        },
      });

      this.logger.info('Starting events handler container...');
      await this.docker.getContainer('runtipi-events-handler').start();

      this.logger.info('Events handler container ready!');

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };

  public restart = async () => {
    try {
      const { jwtSecret } = getEnv();

      const token = jwt.sign({ skill: 'issue' }, jwtSecret);
      await fetch('http://runtipi-events-handler/api/restart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
