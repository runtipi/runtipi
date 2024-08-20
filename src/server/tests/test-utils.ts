import path from 'node:path';
import * as schema from '@runtipi/db';
import pg, { Pool } from 'pg';
import { getClass } from 'src/inversify.config';
import { TipiConfig } from '../core/TipiConfig';

export type TestDatabase = {
  client: Pool;
  dbClient: schema.IDbClient;
};

/**
 * Given a test suite name, create a new database and return a client to it.
 *
 * @param {string} testsuite - name of the test suite
 */
const createDatabase = async (testsuite: string): Promise<TestDatabase> => {
  const { postgresHost, postgresDatabase, postgresPort, postgresUsername, postgresPassword } = TipiConfig.getConfig();
  const pgClient = new pg.Client({
    user: postgresUsername,
    host: postgresHost,
    database: postgresDatabase,
    password: postgresPassword,
    port: postgresPort,
  });
  await pgClient.connect();

  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.query(`CREATE DATABASE ${testsuite}`);

  await pgClient.end();

  const logger = getClass('ILogger');

  const migrator = new schema.Migrator(logger);
  await migrator.runPostgresMigrations({
    port: postgresPort,
    host: postgresHost,
    username: postgresUsername,
    password: postgresPassword,
    database: testsuite,
    migrationsFolder: path.join(__dirname, '../../../packages/db/assets'),
  });

  const client = new Pool({
    connectionString: `postgresql://${TipiConfig.getConfig().postgresUsername}:${TipiConfig.getConfig().postgresPassword}@${
      TipiConfig.getConfig().postgresHost
    }:${TipiConfig.getConfig().postgresPort}/${testsuite}?connect_timeout=300`,
  });

  return {
    client,
    dbClient: new schema.DbClient(
      {
        host: postgresHost,
        port: postgresPort,
        username: postgresUsername,
        password: postgresPassword,
        database: testsuite,
      },
      logger,
    ),
  };
};

/**
 * Clear the database and close the connection.
 *
 * @param {TestDatabase} database - database to clear
 */
const clearDatabase = async (database: TestDatabase) => {
  await database.dbClient.db.delete(schema.userTable);
  await database.dbClient.db.delete(schema.appTable);
};

const closeDatabase = async (database: TestDatabase) => {
  await clearDatabase(database);
  await database.client.end();
};

export { createDatabase, clearDatabase, closeDatabase };
