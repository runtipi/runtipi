import 'reflect-metadata';

import { type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import path from 'path';
import { DATA_DIR } from './config';
import { ISocketManager, SocketManager } from './lib/socket/SocketManager';

export function createContainer() {
  const container = new Container();

  container.bind<ILogger>('ILogger').toDynamicValue(() => {
    return new Logger('worker', path.join(DATA_DIR, 'logs'));
  });
  container.bind<ISocketManager>('ISocketManager').to(SocketManager).inSingletonScope();

  return container;
}

export const container = createContainer();
