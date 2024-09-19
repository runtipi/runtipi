import path from 'node:path';
import { Cache, type ICache } from '@runtipi/cache';
import { DbClient, type IDbClient, type IMigrator, Migrator } from '@runtipi/db';
import { AppDataService, BackupManager, type IAppDataService, type IBackupManager, type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import { DATA_DIR, APP_DATA_DIR } from './config';
import { type ISocketManager, SocketManager } from './lib/socket/SocketManager';
import { AppExecutors, type IAppExecutors } from './services/app/app.executors';
import { getEnv } from './lib/environment';
import { AppFileAccessor, type IAppFileAccessor } from '@runtipi/shared/node';

export function createContainer() {
  try {
    const container = new Container();

    const { appsRepoId, redisPassword, redisHost, postgresHost, postgresPassword, postgresDatabase, postgresPort, postgresUsername } = getEnv();

    const logger = new Logger('worker', path.join(DATA_DIR, 'logs'));
    container.bind<ILogger>('ILogger').toConstantValue(logger);

    const cache = new Cache({ host: redisHost, port: 6379, password: redisPassword }, logger);
    container.bind<ICache>('ICache').toConstantValue(cache);

    container.bind<ISocketManager>('ISocketManager').to(SocketManager).inSingletonScope();

    container.bind<IAppFileAccessor>('IAppFileAccessor').toDynamicValue(() => {
      return new AppFileAccessor({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId, logger });
    });

    container.bind<IAppDataService>('IAppDataService').toDynamicValue(() => {
      return new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId, logger });
    });

    container.bind<IBackupManager>('IBackupManager').toDynamicValue(() => {
      return new BackupManager({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, logger });
    });

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

    container.bind<IMigrator>('IMigrator').toDynamicValue((context) => {
      return new Migrator(context.container.get<ILogger>('ILogger'));
    });

    container.bind<IAppExecutors>('IAppExecutors').to(AppExecutors);

    return container;
  } catch (error) {
    console.error('Error creating container', error);
    throw error;
  }
}

export const container = createContainer();
