import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { TipiConfig } from '../core/TipiConfig/TipiConfig';
import * as schema from './schema';

const connectionString = `postgresql://${TipiConfig.getConfig().postgresUsername}:${TipiConfig.getConfig().postgresPassword}@${
  TipiConfig.getConfig().postgresHost
}:${TipiConfig.getConfig().postgresPort}/${TipiConfig.getConfig().postgresDatabase}?connect_timeout=300`;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
