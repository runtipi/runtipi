import 'reflect-metadata';

import { SystemEvent, cleanseErrorData } from '@runtipi/shared';

import path from 'node:path';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import * as Sentry from '@sentry/node';
import { extraErrorDataIntegration } from '@sentry/integrations';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { copySystemFiles, generateSystemEnvFile, generateTlsCertificates } from '@/lib/system';
import { runPostgresMigrations } from '@/lib/migrations';
import { startWorker } from './watcher/watcher';
import { logger } from '@/lib/logger';
import { AppExecutors, RepoExecutors } from './services';
import { setupRoutes } from './api';
import { DATA_DIR } from './config';
import { socketManager } from './lib/socket';

const envFile = path.join(DATA_DIR, '.env');

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
      Sentry.localVariablesIntegration({
        captureAllExceptions: true,
      }),
      extraErrorDataIntegration,
    ],
  });
};

const main = async () => {
  try {
    await logger.flush();

    logger.info(`Running tipi-worker version: ${process.env.TIPI_VERSION}`);
    logger.info('Generating system env file...');
    const envMap = await generateSystemEnvFile();

    logger.info('Copying system files...');
    await copySystemFiles(envMap);

    if (
      envMap.get('ALLOW_ERROR_MONITORING') === 'true' &&
      process.env.NODE_ENV === 'production' &&
      process.env.LOCAL !== 'true'
    ) {
      logger.info(
        `Anonymous error monitoring is enabled, to disable it add "allowErrorMonitoring": false to your settings.json file. Version: ${process.env.TIPI_VERSION}`,
      );
      setupSentry(process.env.TIPI_VERSION);
    }

    // Reload env variables after generating the env file
    logger.info('Reloading env variables...');
    dotenv.config({ path: envFile, override: true });

    logger.info('Generating TLS certificates...');
    await generateTlsCertificates({ domain: envMap.get('LOCAL_DOMAIN') });

    socketManager.init();

    const repoExecutors = new RepoExecutors();

    const clone = await repoExecutors.cloneRepo(envMap.get('APPS_REPO_URL') as string);
    if (!clone.success) {
      logger.error(`Failed to clone repo ${envMap.get('APPS_REPO_URL') as string}`);
    }

    if (process.env.NODE_ENV !== 'development') {
      const pull = await repoExecutors.pullRepo(envMap.get('APPS_REPO_URL') as string);
      if (!pull.success) {
        logger.error(`Failed to pull repo ${envMap.get('APPS_REPO_URL') as string}`);
      }
    }

    logger.info('Starting queue...');
    const queue = new Queue('events', {
      connection: {
        host: envMap.get('REDIS_HOST'),
        port: 6379,
        password: envMap.get('REDIS_PASSWORD'),
      },
    });
    const repeatQueue = new Queue('repeat', {
      connection: {
        host: envMap.get('REDIS_HOST'),
        port: 6379,
        password: envMap.get('REDIS_PASSWORD'),
      },
    });
    logger.info('Obliterating queue...');
    await queue.obliterate({ force: true });
    await repeatQueue.obliterate({ force: true });

    // Scheduled jobs
    if (process.env.NODE_ENV === 'production') {
      logger.info('Adding scheduled jobs to queue...');
      await repeatQueue.add(
        `${Math.random().toString()}_repo_update`,
        { type: 'repo', command: 'update', url: envMap.get('APPS_REPO_URL') } as SystemEvent,
        { repeat: { pattern: '*/30 * * * *' } },
      );
    }

    logger.info('Closing queue...');
    await queue.close();
    await repeatQueue.close();

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
    const cache = new Redis({
      host: envMap.get('REDIS_HOST'),
      port: 6379,
      password: envMap.get('REDIS_PASSWORD'),
    });
    await cache.set('status', 'RUNNING');
    await cache.quit();

    // Start all apps
    const appExecutor = new AppExecutors();
    logger.info('Starting all apps...');

    // Fire and forget
    void appExecutor.startAllApps();

    const app = new Hono().basePath('/worker-api');
    serve({ fetch: app.fetch, port: 5000 }, (info) => {
      startWorker();

      setupRoutes(app);
      logger.info(`Listening on http://localhost:${info.port}`);
    });
  } catch (e) {
    Sentry.captureException(e);
    logger.error(e);

    setTimeout(() => {
      process.exit(1);
    }, 2000);
  }
};

void main();
