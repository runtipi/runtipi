import 'reflect-metadata';
import path from 'node:path';
import { Cache, type ICache } from '@runtipi/cache';
import { DbClient, type IDbClient } from '@runtipi/db';
import { type ILogger, Logger } from '@runtipi/shared/node';
import { Container } from 'inversify';
import { DATA_DIR } from './config';
import { type ISessionManager, SessionManager } from './server/common/session-manager';
import { TipiConfig } from './server/core/TipiConfig';
import { AppQueries, type IAppQueries } from './server/queries/apps/apps.queries';
import { AuthQueries, type IAuthQueries } from './server/queries/auth/auth.queries';
import { type ILinkQueries, LinkQueries } from './server/queries/links/links.queries';
import { AuthService, type IAuthService } from './server/services/auth/auth.service';
import { CustomLinksService, type ICustomLinksService } from './server/services/custom-links/custom-links.service';
import { type ISystemService, SystemService } from './server/services/system/system.service';

export function createContainer() {
  const container = new Container();

  const { postgresHost, postgresPort, postgresDatabase, postgresPassword, postgresUsername, redisPassword, REDIS_HOST } = TipiConfig.getConfig();

  container.bind<ILogger>('ILogger').toDynamicValue(() => {
    return new Logger('dashboard', path.join(DATA_DIR, 'logs'));
  });
  container
    .bind<ICache>('ICache')
    .toDynamicValue((context) => {
      const logger = context.container.get<ILogger>('ILogger');
      return new Cache({ host: REDIS_HOST, port: 6379, password: redisPassword }, logger);
    })
    .inSingletonScope();

  container
    .bind<IDbClient>('IDbClient')
    .toDynamicValue((context) => {
      return new DbClient(
        {
          host: postgresHost,
          port: Number(postgresPort),
          database: postgresDatabase,
          password: postgresPassword,
          username: postgresUsername,
        },
        context.container.get<ILogger>('ILogger'),
      );
    })
    .inSingletonScope();

  // Repositories
  container.bind<IAppQueries>('IAppQueries').to(AppQueries);
  container.bind<IAuthQueries>('IAuthQueries').to(AuthQueries);
  container.bind<ILinkQueries>('ILinkQueries').to(LinkQueries);

  // Services
  container.bind<ICustomLinksService>('ICustomLinksService').to(CustomLinksService);
  container.bind<IAuthService>('IAuthService').to(AuthService);
  container.bind<ISystemService>('ISystemService').to(SystemService);

  container.bind<ISessionManager>('ISessionManager').to(SessionManager);

  return container;
}

export const container = createContainer();
