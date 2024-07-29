import 'reflect-metadata';
import { ITipiCache, TipiCache } from '@/server/core/TipiCache/TipiCache';
import { type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import path from 'path';
import { DATA_DIR } from './config';

export function createContainer() {
  const container = new Container();

  container.bind<ILogger>('ILogger').toDynamicValue(() => {
    return new Logger('dashboard', path.join(DATA_DIR, 'logs'));
  });
  container.bind<ITipiCache>('ITipiCache').to(TipiCache).inSingletonScope();

  return container;
}

export const container = createContainer();
