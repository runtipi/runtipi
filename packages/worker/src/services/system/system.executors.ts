import fs from 'fs';
import si from 'systeminformation';
import * as Sentry from '@sentry/node';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/environment';
import Docker from 'dockerode';
import { pathExists } from '@runtipi/shared/node';
import path from 'path';

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

  public restart = async () => {
    try {
      const { rootFolderHost } = getEnv();
      let composeFile = '';

      if (process.env.NODE_ENV === 'development') {
        composeFile = path.join(rootFolderHost, 'docker-compose.prod.yml');
      } else if (
        process.env.NODE_ENV === 'production' &&
        (await pathExists(path.join(rootFolderHost, 'docker-compose.prod.yml')))
      ) {
        composeFile = path.join(rootFolderHost, 'docker-compose.prod.yml');
      } else {
        composeFile = path.join(rootFolderHost, 'docker-compose.yml');
      }

      try {
        await this.docker.getContainer('runtipi-events-handler').remove({ force: true });
      } catch (e) {
        this.logger.warn(
          "Faield to remove old runtipi-events-handler container, probably doesn't exist",
        );
      }

      await this.docker.createImage({
        fromImage: 'busybox:1.36.1',
      });

      const commandData = {
        name: 'runtipi-events-handler',
        Image: 'busybox:1.36.1',
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Tty: true,
        HostConfig: {
          AutoRemove: process.env.NODE_ENV === 'development' ? false : true,
          Binds: [
            `${rootFolderHost}:${rootFolderHost}`,
            '/var/run/docker.sock:/var/run/docker.sock:ro',
            '/usr/libexec/docker/cli-plugins:/usr/libexec/docker/cli-plugins:ro',
            '/usr/bin/docker:/usr/bin/docker:ro',
          ],
        },
        WorkingDir: rootFolderHost,
        Cmd: [
          'docker',
          'compose',
          '-f',
          composeFile,
          '--env-file',
          path.join(rootFolderHost, '.env'),
          '--project-name',
          'runtipi',
          'restart',
        ],
      };

      await this.docker.createContainer(commandData).then(async () => {
        await this.docker.getContainer('runtipi-events-handler').start();
      });

      return { success: true, message: '' };
    } catch (e) {
      return this.handleSystemError(e);
    }
  };
}
