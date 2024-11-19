import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../packages/backend/src/core/database/drizzle/schema';

const connectionString = `postgresql://tipi:${process.env.POSTGRES_PASSWORD}@${process.env.SERVER_IP}:5432/tipi?connect_timeout=300`;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export const clearDatabase = async () => {
  // delete all data in table user
  await db.delete(schema.user);
  await db.delete(schema.app);
};
