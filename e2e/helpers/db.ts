import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/server/db/schema';

const connectionString = `postgresql://tipi:postgres@${process.env.SERVER_IP}:5432/tipi?connect_timeout=300`;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export const clearDatabase = async () => {
  // delete all data in table user
  await db.delete(schema.userTable);
  await db.delete(schema.appTable);
};
