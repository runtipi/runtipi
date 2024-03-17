/* eslint-disable no-restricted-syntax */
import pg, { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
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
  const { POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DBNAME } = process.env;

  const pgClient = new pg.Client({
    user: POSTGRES_USERNAME,
    host: POSTGRES_HOST,
    database: POSTGRES_DBNAME,
    password: POSTGRES_PASSWORD,
    port: Number(POSTGRES_PORT),
  });
  await pgClient.connect();

  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.query(`CREATE DATABASE ${testsuite}`);

  await pgClient.end();

  await runPostgresMigrations(testsuite);

  const client = new Pool({
    connectionString: `postgresql://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${testsuite}?connect_timeout=300`,
  });

  return { client, db: drizzle(client, { schema }) };
};

/**
 * Clear the database and close the connection.
 *
 * @param {TestDatabase} database - database to clear
 */
const clearDatabase = async (database: TestDatabase) => {
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- we want to clear the whole table
  await database.db.delete(schema.userTable);
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- we want to clear the whole table
  await database.db.delete(schema.appTable);
};

const closeDatabase = async (database: TestDatabase) => {
  await clearDatabase(database);
  await database.client.end();
};

/**
 * Setup a test suite by mocking the database.
 *
 * @param {string} testSuite - name of the test suite
 */
export async function setupTestSuite(testSuite: string) {
  const db = await createDatabase(testSuite);

  jest.mock('../db', () => {
    return { db: db.db };
  });

  return { db: db.db, client: db.client };
}

export { createDatabase, clearDatabase, closeDatabase };
