import path from 'path';
import { spawn } from 'node:child_process';
import { execAsync, pathExists } from '@runtipi/shared/node';
import { sanitizePath } from '@runtipi/shared';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/environment';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { Socket } from 'socket.io';
import { SocketManager } from '@/lib/socket/SocketManager';
import { z } from 'zod';

const getBaseComposeArgs = async (appId: string) => {
  const { arch, appsRepoId } = getEnv();
  const appDataDirPath = path.join(APP_DATA_DIR, sanitizePath(appId));
  const appDirPath = path.join(DATA_DIR, 'apps', sanitizePath(appId));

  const args: string[] = [`--env-file ${path.join(appDataDirPath, 'app.env')}`];

  // User custom env file
  const userEnvFile = path.join(DATA_DIR, 'user-config', sanitizePath(appId), 'app.env');
  if (await pathExists(userEnvFile)) {
    args.push(`--env-file ${userEnvFile}`);
  }

  args.push(`--project-name ${appId}`);

  let composeFile = path.join(appDirPath, 'docker-compose.yml');
  if (arch === 'arm64' && (await pathExists(path.join(appDirPath, 'docker-compose.arm64.yml')))) {
    composeFile = path.join(appDirPath, 'docker-compose.arm64.yml');
  }
  args.push(`-f ${composeFile}`);

  const commonComposeFile = path.join(
    DATA_DIR,
    'repos',
    sanitizePath(appsRepoId),
    'apps',
    'docker-compose.common.yml',
  );
  args.push(`-f ${commonComposeFile}`);

  // User defined overrides
  const userComposeFile = path.join(
    DATA_DIR,
    'user-config',
    sanitizePath(appId),
    'docker-compose.yml',
  );
  if (await pathExists(userComposeFile)) {
    args.push(`--file ${userComposeFile}`);
  }

  return args;
};

/**
 * Helpers to execute docker compose commands
 * @param {string} appId - App name
 * @param {string} command - Command to execute
 */
export const compose = async (appId: string, command: string) => {
  const args = await getBaseComposeArgs(appId);
  args.push(command);

  logger.info(`Running docker compose with args ${args.join(' ')}`);
  const { stdout, stderr } = await execAsync(`docker-compose ${args.join(' ')}`);

  if (stderr && stderr.includes('Command failed:')) {
    throw new Error(stderr);
  }

  return { stdout, stderr };
};

export const handleViewLogsEvent = async (socket: Socket, eventData: { appId: string }) => {
  const parsedData = z.object({ appId: z.string() }).safeParse(eventData);

  if (!parsedData.success) {
    logger.error('Invalid viewLogs event data:', eventData);
    return;
  }

  const args = await getBaseComposeArgs(parsedData.data.appId);
  args.push('logs --follow -n 25');

  const logsCommand = `docker-compose ${args.join(' ')}`;

  const ls = spawn('sh', ['-c', logsCommand]);

  socket.on('disconnect', () => {
    ls.kill('SIGINT');
  });

  socket.on('stopLogs', () => {
    ls.kill('SIGINT');
  });

  ls.on('error', (error) => {
    logger.error('Error running logs command: ', error);
    ls.kill('SIGINT');
  });

  ls.stdout.on('data', async (data) => {
    const lines = data
      .toString()
      .split(/(?:\r\n|\r|\n)/g)
      .filter(Boolean);

    await SocketManager.emit({
      type: 'logs',
      event: 'newLogs',
      data: { lines, appId: parsedData.data.appId },
    });
  });
};
