/* eslint-disable no-restricted-syntax */
import pg, { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { TipiConfig } from '../core/TipiConfig';
import * as schema from '../db/schema';
import { Database } from '../db';
import { runPostgresMigrations } from '../run-migrations-dev';

export type TestDatabase = {
  client: Pool;
  db: Database;
};

/**
 * Given a test suite name, create a new database and return a client to it.
 *
 * @param {string} testsuite - name of the test suite
 */
const createDatabase = async (testsuite: string): Promise<TestDatabase> => {
  const pgClient = new pg.Client({
    user: TipiConfig.getConfig().postgresUsername,
    host: TipiConfig.getConfig().postgresHost,
    database: TipiConfig.getConfig().postgresDatabase,
    password: TipiConfig.getConfig().postgresPassword,
    port: TipiConfig.getConfig().postgresPort,
  });
  await pgClient.connect();

  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.query(`CREATE DATABASE ${testsuite}`);

  await pgClient.end();

  await runPostgresMigrations(testsuite);

  const client = new Pool({
    connectionString: `postgresql://${TipiConfig.getConfig().postgresUsername}:${TipiConfig.getConfig().postgresPassword}@${
      TipiConfig.getConfig().postgresHost
    }:${TipiConfig.getConfig().postgresPort}/${testsuite}?connect_timeout=300`,
  });

  return { client, db: drizzle(client, { schema }) };
};

/**
 * Clear the database and close the connection.
 *
 * @param {TestDatabase} database - database to clear
 */
const clearDatabase = async (database: TestDatabase) => {
  await database.db.delete(schema.userTable);
  await database.db.delete(schema.appTable);
};

const closeDatabase = async (database: TestDatabase) => {
  await clearDatabase(database);
  await database.client.end();
};

export { createDatabase, clearDatabase, closeDatabase };
