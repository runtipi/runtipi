import path from 'node:path';
import { Cache, type ICache } from '@runtipi/cache';
import { DbClient, type IDbClient, type IMigrator, Migrator } from '@runtipi/db';
import { AppDataService, BackupManager, type IAppDataService, type IBackupManager, type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import { DATA_DIR, APP_DATA_DIR } from './config';
import { type ISocketManager, SocketManager } from './lib/socket/SocketManager';
import { AppExecutors, type IAppExecutors } from './services/app/app.executors';
import { AppFileAccessor, type IAppFileAccessor } from '@runtipi/shared/node';

export function createContainer() {
  try {
    const container = new Container();

    const { REDIS_HOST, REDIS_PASSWORD, APPS_REPO_ID, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_DBNAME, POSTGRES_USERNAME } =
      process.env;

    const logger = new Logger('worker', path.join(DATA_DIR, 'logs'));
    container.bind<ILogger>('ILogger').toConstantValue(logger);

    const cache = new Cache({ host: REDIS_HOST, port: 6379, password: REDIS_PASSWORD }, logger);
    container.bind<ICache>('ICache').toConstantValue(cache);

    container.bind<ISocketManager>('ISocketManager').to(SocketManager).inSingletonScope();

    container.bind<IAppFileAccessor>('IAppFileAccessor').toDynamicValue(() => {
      return new AppFileAccessor({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: APPS_REPO_ID, logger });
    });

    container.bind<IAppDataService>('IAppDataService').toDynamicValue(() => {
      return new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: APPS_REPO_ID, logger });
    });

    container.bind<IBackupManager>('IBackupManager').toDynamicValue(() => {
      return new BackupManager({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, logger });
    });

    container
      .bind<IDbClient>('IDbClient')
      .toDynamicValue((context) => {
        return new DbClient(
          {
            host: POSTGRES_HOST,
            port: Number(POSTGRES_PORT),
            password: POSTGRES_PASSWORD,
            database: POSTGRES_DBNAME,
            username: POSTGRES_USERNAME,
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
