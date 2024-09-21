import path from 'node:path';
import { Cache, type ICache } from '@runtipi/cache';
import { DbClient, type IDbClient, type IMigrator, Migrator } from '@runtipi/db';
import { AppDataService, BackupManager, type IAppDataService, type IBackupManager, type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import { DATA_DIR, APP_DATA_DIR } from './config';
import { type ISocketManager, SocketManager } from './lib/socket/SocketManager';
import { AppExecutors, type IAppExecutors } from './services/app/app.executors';
import { AppFileAccessor, type IAppFileAccessor } from '@runtipi/shared/node';
import { generateSystemEnvFile } from './lib/system';
import { getEnv } from './lib/environment';

export function createContainer() {
  try {
    generateSystemEnvFile();

    const container = new Container();

    const { postgresHost, postgresPort, postgresDatabase, postgresPassword, postgresUsername, redisHost, redisPassword, appsRepoId } = getEnv();

    const logger = new Logger('worker', path.join(DATA_DIR, 'logs'));
    container.bind<ILogger>('ILogger').toConstantValue(logger);

    logger.debug('process.env', JSON.stringify(process.env, null, 2));

    const cache = new Cache({ host: redisHost, port: 6379, password: redisPassword }, logger);
    container.bind<ICache>('ICache').toConstantValue(cache);

    container.bind<ISocketManager>('ISocketManager').to(SocketManager).inSingletonScope();

    container
      .bind<IAppFileAccessor>('IAppFileAccessor')
      .toDynamicValue(() => {
        return new AppFileAccessor({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId, logger });
      })
      .inSingletonScope();

    container
      .bind<IAppDataService>('IAppDataService')
      .toDynamicValue(() => {
        return new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId, logger });
      })
      .inSingletonScope();

    container
      .bind<IBackupManager>('IBackupManager')
      .toDynamicValue(() => {
        return new BackupManager({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, logger });
      })
      .inSingletonScope();

    container
      .bind<IDbClient>('IDbClient')
      .toDynamicValue((context) => {
        return new DbClient(
          {
            host: postgresHost,
            port: postgresPort,
            password: postgresPassword,
            database: postgresDatabase,
            username: postgresUsername,
          },
          context.container.get<ILogger>('ILogger'),
        );
      })
      .inSingletonScope();

    container
      .bind<IMigrator>('IMigrator')
      .toDynamicValue((context) => {
        return new Migrator(context.container.get<ILogger>('ILogger'));
      })
      .inSingletonScope();

    container.bind<IAppExecutors>('IAppExecutors').to(AppExecutors);

    return container;
  } catch (error) {
    console.error('Error creating container', error);
    throw error;
  }
}

export const container = createContainer();
