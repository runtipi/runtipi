import pg from 'pg';
import { getEnv } from '../environment';

export const getDbClient = async () => {
  const { postgresHost, postgresDatabase, postgresUsername, postgresPassword, postgresPort } = getEnv();

  const client = new pg.Client({
    host: postgresHost,
    database: postgresDatabase,
    user: postgresUsername,
    password: postgresPassword,
    port: Number(postgresPort),
  });

  await client.connect();

  return client;
};
