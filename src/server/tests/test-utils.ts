import pg, { Pool } from 'pg';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { runPostgresMigrations } from '../run-migration';
import { getConfig } from '../core/TipiConfig';
import { appTable, userTable } from '../db/schema';

export type TestDatabase = {
  client: Pool;
  db: NodePgDatabase;
};

/**
 * Given a test suite name, create a new database and return a client to it.
 *
 * @param {string} testsuite - name of the test suite
 */
const createDatabase = async (testsuite: string): Promise<TestDatabase> => {
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

  const client = new Pool({
    connectionString: `postgresql://${getConfig().postgresUsername}:${getConfig().postgresPassword}@${getConfig().postgresHost}:${getConfig().postgresPort}/${testsuite}?connect_timeout=300`,
  });

  return { client, db: drizzle(client) };
};

/**
 * Clear the database and close the connection.
 *
 * @param {TestDatabase} database - database to clear
 */
const clearDatabase = async (database: TestDatabase) => {
  await database.db.delete(userTable);
  await database.db.delete(appTable);
};

const closeDatabase = async (database: TestDatabase) => {
  await clearDatabase(database);
  await database.client.end();
};

export { createDatabase, clearDatabase, closeDatabase };
