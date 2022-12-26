/* eslint-disable vars-on-top */
import { PrismaClient } from '@prisma/client';

import { getConfig } from '../core/TipiConfig/TipiConfig';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: getConfig().NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: `postgresql://${getConfig().postgresUsername}:${getConfig().postgresPassword}@${getConfig().postgresHost}:${getConfig().postgresPort}/${getConfig().postgresDatabase}`,
        // url: `postgresql://${getConfig().postgresUsername}:${getConfig().postgresPassword}@${getConfig().postgresHost}:${getConfig().postgresPort}/${getConfig().postgresDatabase}`,
      },
    },
  });

if (getConfig().NODE_ENV !== 'production') {
  global.prisma = prisma;
}
