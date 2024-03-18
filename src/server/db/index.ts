import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const getConnectionString = () => {
  const { POSTGRES_PASSWORD, POSTGRES_USERNAME, POSTGRES_PORT, POSTGRES_DBNAME, POSTGRES_HOST } = process.env;

  return `postgresql://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DBNAME}?connect_timeout=300`;
};

const pool = new Pool({
  connectionString: getConnectionString(),
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
