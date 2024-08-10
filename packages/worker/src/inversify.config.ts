import path from 'node:path';
import { DbClient, type IDbClient, type IMigrator, Migrator } from '@runtipi/db';
import { type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import { DATA_DIR } from './config';
import { type ISocketManager, SocketManager } from './lib/socket/SocketManager';
import { AppExecutors, type IAppExecutors } from './services/app/app.executors';

export function createContainer() {
  try {
    const container = new Container();

    container.bind<ILogger>('ILogger').toDynamicValue(() => {
      return new Logger('worker', path.join(DATA_DIR, 'logs'));
    });
    container.bind<ISocketManager>('ISocketManager').to(SocketManager).inSingletonScope();

    container
      .bind<IDbClient>('IDbClient')
      .toDynamicValue((context) => {
        return new DbClient(
          {
            host: String(process.env.POSTGRES_HOST),
            port: Number(process.env.POSTGRES_PORT),
            password: String(process.env.POSTGRES_PASSWORD),
            database: 'tipi',
            username: 'tipi',
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
