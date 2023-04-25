import pg from 'pg';
import { getConfig } from '../../src/server/core/TipiConfig';

export const clearDatabase = async () => {
  const pgClient = new pg.Client({
    user: getConfig().postgresUsername,
    host: 'localhost',
    database: getConfig().postgresDatabase,
    password: getConfig().postgresPassword,
    port: getConfig().postgresPort,
  });

  await pgClient.connect();

  // delete all data in table user
  await pgClient.query('DELETE FROM "user"');
  await pgClient.query('DELETE FROM "app"');

  await pgClient.end();
};
