import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import * as schema from '../../core/database/drizzle/schema';

export const createTestDatabase = async (testsuite: string) => {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5433,
  });

  await client.connect();

  await client.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await client.query(`CREATE DATABASE ${testsuite}`);

  await client.end();

  const connectionString = `postgresql://postgres:postgres@localhost:5433/${testsuite}?connect_timeout=300`;
  const drizzleClient = drizzle(connectionString, { schema });

  await migrate(drizzleClient, { migrationsFolder: path.join(import.meta.dirname, '..', '..', 'core', 'database', 'drizzle') }).catch((e) => {
    console.error('Failed to run migrations', e);
  });

  const yo = await drizzleClient.select().from(schema.app);

  return drizzleClient;
};
