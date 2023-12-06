import { SystemEvent } from '@runtipi/shared';
import { Server } from 'socket.io';

import http from 'node:http';
import path from 'node:path';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import { copySystemFiles, ensureFilePermissions, generateSystemEnvFile, generateTlsCertificates } from '@/lib/system';
import { runPostgresMigrations } from '@/lib/migrations';
import { startWorker } from './watcher/watcher';
import { logger } from '@/lib/logger';
import { AppExecutors } from './services';
import { SocketManager } from './lib/socket/SocketManager';

const rootFolder = '/app';
const envFile = path.join(rootFolder, '.env');

const main = async () => {
  try {
    await logger.flush();

    logger.info('Copying system files...');
    await copySystemFiles();

    logger.info('Generating system env file...');
    const envMap = await generateSystemEnvFile();

    // Reload env variables after generating the env file
    logger.info('Reloading env variables...');
    dotenv.config({ path: envFile, override: true });

    logger.info('Generating TLS certificates...');
    await generateTlsCertificates({ domain: envMap.get('LOCAL_DOMAIN') });

    logger.info('Ensuring file permissions...');
    await ensureFilePermissions();

    logger.info('Starting queue...');
    const queue = new Queue('events', { connection: { host: envMap.get('REDIS_HOST'), port: 6379, password: envMap.get('REDIS_PASSWORD') } });
    logger.info('Obliterating queue...');
    await queue.obliterate({ force: true });

    // Initial jobs
    logger.info('Adding initial jobs to queue...');
    await queue.add(`${Math.random().toString()}_system_info`, { type: 'system', command: 'system_info' } as SystemEvent);
    await queue.add(`${Math.random().toString()}_repo_clone`, { type: 'repo', command: 'clone', url: envMap.get('APPS_REPO_URL') } as SystemEvent);
    await queue.add(`${Math.random().toString()}_repo_update`, { type: 'repo', command: 'update', url: envMap.get('APPS_REPO_URL') } as SystemEvent);

    // Scheduled jobs
    logger.info('Adding scheduled jobs to queue...');
    await queue.add(`${Math.random().toString()}_repo_update`, { type: 'repo', command: 'update', url: envMap.get('APPS_REPO_URL') } as SystemEvent, { repeat: { pattern: '*/30 * * * *' } });
    await queue.add(`${Math.random().toString()}_system_info`, { type: 'system', command: 'system_info' } as SystemEvent, { repeat: { pattern: '* * * * *' } });

    logger.info('Closing queue...');
    await queue.close();

    logger.info('Running database migrations...');
    await runPostgresMigrations({
      postgresHost: envMap.get('POSTGRES_HOST') as string,
      postgresDatabase: envMap.get('POSTGRES_DBNAME') as string,
      postgresUsername: envMap.get('POSTGRES_USERNAME') as string,
      postgresPassword: envMap.get('POSTGRES_PASSWORD') as string,
      postgresPort: envMap.get('POSTGRES_PORT') as string,
    });

    // Set status to running
    logger.info('Setting status to running...');
    const cache = new Redis({ host: envMap.get('REDIS_HOST'), port: 6379, password: envMap.get('REDIS_PASSWORD') });
    await cache.set('status', 'RUNNING');
    await cache.quit();

    // Start all apps
    const appExecutor = new AppExecutors();
    logger.info('Starting all apps...');
    appExecutor.startAllApps();

    const server = http.createServer((req, res) => {
      if (req.url === '/healthcheck') {
        res.writeHead(200);
        res.end('OK');
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(3000, () => {
      startWorker();
    });

    const io = new Server(3001, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
      SocketManager.addSocket(socket);

      socket.on('disconnect', () => {
        SocketManager.removeSocket();
      });
    });
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
};

main();
