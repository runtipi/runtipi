import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getConfig } from '../core/TipiConfig/TipiConfig';
import * as schema from './schema';

const connectionString = `postgresql://${getConfig().postgresUsername}:${getConfig().postgresPassword}@${getConfig().postgresHost}:${getConfig().postgresPort}/${
  getConfig().postgresDatabase
}?connect_timeout=300`;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
