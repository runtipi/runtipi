import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { runPostgresMigrations } from '../../src/server/run-migration';
import { getConfig } from '../../src/server/core/TipiConfig';

/**
 * Given a test suite name, create a new database and return a client to it.
 *
 * @param {string} testsuite - name of the test suite
 */
async function getTestDbClient(testsuite: string) {
  const pgClient = new pg.Client({
    user: getConfig().postgresUsername,
    host: getConfig().postgresHost,
    database: getConfig().postgresDatabase,
    password: getConfig().postgresPassword,
    port: getConfig().postgresPort,
  });
  await pgClient.connect();

  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.query(`CREATE DATABASE ${testsuite}`);

  await pgClient.end();

  await runPostgresMigrations(testsuite);

  return new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://${getConfig().postgresUsername}:${getConfig().postgresPassword}@${getConfig().postgresHost}:${getConfig().postgresPort}/${testsuite}?connect_timeout=300`,
      },
    },
  });
}

export { getTestDbClient };
