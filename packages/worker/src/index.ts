import { SystemEvent } from '@runtipi/shared';

import http from 'node:http';
import path from 'node:path';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { cleanseErrorData } from '@runtipi/shared/src/helpers/error-helpers';
import { ExtraErrorData } from '@sentry/integrations';
import { copySystemFiles, ensureFilePermissions, generateSystemEnvFile, generateTlsCertificates } from '@/lib/system';
import { runPostgresMigrations } from '@/lib/migrations';
import { startWorker } from './watcher/watcher';
import { logger } from '@/lib/logger';
import { AppExecutors } from './services';
import { SocketManager } from './lib/socket/SocketManager';

const rootFolder = '/app';
const envFile = path.join(rootFolder, '.env');

const setupSentry = (release?: string) => {
  Sentry.init({
    release,
    environment: process.env.NODE_ENV,
    dsn: 'https://1cf49526d2efde9f82b6584c9c0f6912@o4504242900238336.ingest.sentry.io/4506360656035840',
    beforeSend: cleanseErrorData,
    includeLocalVariables: true,
    initialScope: {
      tags: { version: release },
    },
    integrations: [
      new Sentry.Integrations.LocalVariables({
        captureAllExceptions: true,
      }),
      new ExtraErrorData(),
    ],
  });
};

const main = async () => {
  try {
    await logger.flush();

    logger.info('Copying system files...');
    await copySystemFiles();

    logger.info('Generating system env file...');
    const envMap = await generateSystemEnvFile();

    if (envMap.get('ALLOW_ERROR_MONITORING') === 'true' && process.env.NODE_ENV === 'production') {
      logger.info(`Anonymous error monitoring is enabled, to disable it add "allowErrorMonitoring": false to your settings.json file. Version: ${process.env.TIPI_VERSION}`);
      setupSentry(process.env.TIPI_VERSION);
    }

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
      SocketManager.init();
      startWorker();
    });
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);

    setTimeout(() => {
      process.exit(1);
    }, 2000);
  }
};

main();
