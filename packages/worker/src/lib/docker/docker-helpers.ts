import path from 'path';
import { spawn } from 'node:child_process';
import { execAsync, pathExists } from '@runtipi/shared/node';
import { SocketEvent, sanitizePath, socketEventSchema } from '@runtipi/shared';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/environment';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { Socket } from 'socket.io';
import { SocketManager } from '@/lib/socket/SocketManager';

const getBaseComposeArgsApp = async (appId: string) => {
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

const getBaseComposeArgsTipi = async () => {
  const args: string[] = [`--env-file ${path.join(DATA_DIR, '.env')}`];

  args.push(`--project-name tipi`);

  const composeFile = path.join(DATA_DIR, 'docker-compose.yml');
  args.push(`-f ${composeFile}`);

  // User defined overrides
  const userComposeFile = path.join(DATA_DIR, 'user-config', 'tipi-compose.yml');
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
  const args = await getBaseComposeArgsApp(appId);
  args.push(command);

  logger.info(`Running docker compose with args ${args.join(' ')}`);
  const { stdout, stderr } = await execAsync(`docker-compose ${args.join(' ')}`);

  if (stderr && stderr.includes('Command failed:')) {
    throw new Error(stderr);
  }

  return { stdout, stderr };
};

export const handleViewRuntipiLogsEvent = async (socket: Socket, event: SocketEvent) => {
  const parsedEvent = socketEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logger.error('Invalid viewLogs event data:', event);
    return;
  }

  if (parsedEvent.data.type !== 'runtipi-logs' && parsedEvent.data.event !== 'viewLogs') {
    return;
  }

  const args = await getBaseComposeArgsTipi();

  args.push('logs --follow -n 25');

  const logsCommand = `docker-compose ${args.join(' ')}`;

  const logs = spawn('sh', ['-c', logsCommand]);

  socket.on('disconnect', () => {
    logs.kill('SIGINT');
  });

  socket.on('runtipi-logs', (data) => {
    if (data.event === 'stopLogs') {
      console.log('Stopping logs');
      logs.kill('SIGINT');
    }
  });

  logs.on('error', (error) => {
    logger.error('Error running logs command: ', error);
    logs.kill('SIGINT');
  });

  logs.stdout.on('data', async (data) => {
    const lines = data
      .toString()
      .split(/(?:\r\n|\r|\n)/g)
      .filter(Boolean);

    await SocketManager.emit({
      type: 'runtipi-logs',
      event: 'newLogs',
      data: { lines },
    });
  });
};

export const handleViewAppLogsEvent = async (socket: Socket, event: SocketEvent) => {
  const parsedEvent = socketEventSchema.safeParse(event);

  if (!parsedEvent.success) {
    logger.error('Invalid viewLogs event data:', event);
    return;
  }

  if (parsedEvent.data.type !== 'app-logs') {
    return;
  }

  if (parsedEvent.data.event !== 'viewLogs') {
    return;
  }

  const { appId } = parsedEvent.data.data;

  const args = await getBaseComposeArgsApp(appId);
  args.push('logs --follow -n 25');

  const logsCommand = `docker-compose ${args.join(' ')}`;

  const logs = spawn('sh', ['-c', logsCommand]);

  socket.on('disconnect', () => {
    logs.kill('SIGINT');
  });

  socket.on('app-logs', (data) => {
    if (data.event === 'stopLogs') {
      console.log('Stopping logs');
      logs.kill('SIGINT');
    }
  });

  logs.on('error', (error) => {
    logger.error('Error running logs command: ', error);
    logs.kill('SIGINT');
  });

  logs.stdout.on('data', async (data) => {
    const lines = data
      .toString()
      .split(/(?:\r\n|\r|\n)/g)
      .filter(Boolean);

    await SocketManager.emit({
      type: 'app-logs',
      event: 'newLogs',
      data: { lines, appId },
    });
  });
};
