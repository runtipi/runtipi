import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getConfig } from '../core/TipiConfig/TipiConfig';

const connectionString = `postgresql://${getConfig().postgresUsername}:${getConfig().postgresPassword}@${getConfig().postgresHost}:${getConfig().postgresPort}/${
  getConfig().postgresDatabase
}?connect_timeout=300`;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool);
