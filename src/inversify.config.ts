import 'reflect-metadata';
import { type ITipiCache, TipiCache } from '@/server/core/TipiCache/TipiCache';
import { type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import path from 'node:path';
import { DATA_DIR } from './config';
import { DbClient, type IDbClient } from '@runtipi/db';
import { TipiConfig } from './server/core/TipiConfig';
import { AppQueries, type IAppQueries } from './server/queries/apps/apps.queries';
import { AuthQueries, type IAuthQueries } from './server/queries/auth/auth.queries';
import { LinkQueries, type ILinkQueries } from './server/queries/links/links.queries';
import { CustomLinksService, type ICustomLinksService } from './server/services/custom-links/custom-links.service';
import { AuthService, type IAuthService } from './server/services/auth/auth.service';

export function createContainer() {
  const container = new Container();

  const { postgresHost, postgresPort, postgresDatabase, postgresPassword, postgresUsername } = TipiConfig.getConfig();

  container.bind<ILogger>('ILogger').toDynamicValue(() => {
    return new Logger('dashboard', path.join(DATA_DIR, 'logs'));
  });
  container.bind<ITipiCache>('ITipiCache').to(TipiCache).inSingletonScope();

  container
    .bind<IDbClient>('IDbClient')
    .toDynamicValue(() => {
      return new DbClient({
        host: postgresHost,
        port: Number(postgresPort),
        database: postgresDatabase,
        password: postgresPassword,
        username: postgresUsername,
      });
    })
    .inSingletonScope();

  // Repositories
  container.bind<IAppQueries>('IAppQueries').to(AppQueries);
  container.bind<IAuthQueries>('IAuthQueries').to(AuthQueries);
  container.bind<ILinkQueries>('ILinkQueries').to(LinkQueries);

  // Services
  container.bind<ICustomLinksService>('ICustomLinksService').to(CustomLinksService);
  container.bind<IAuthService>('IAuthService').to(AuthService);

  return container;
}

export const container = createContainer();
