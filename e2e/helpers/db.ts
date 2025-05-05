import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../packages/backend/src/core/database/drizzle/schema';
import { emptyDir } from './settings';

const connectionString = `postgresql://tipi:${process.env.POSTGRES_PASSWORD}@${process.env.SERVER_IP}:5432/tipi?connect_timeout=300`;

export const db = drizzle(connectionString, { schema });

export const clearDatabase = async () => {
  await emptyDir('./backups');
  await emptyDir('./user-config');

  // delete all data in table user
  await db.delete(schema.link);
  await db.delete(schema.user);
  await db.delete(schema.app);
};
