import pg from 'pg';

export const clearDatabase = async () => {
  const pgClient = new pg.Client({
    user: 'tipi',
    host: process.env.SERVER_IP,
    database: 'tipi',
    password: 'postgres',
    port: 5432,
  });

  await pgClient.connect();

  // delete all data in table user
  await pgClient.query('DELETE FROM "user"');
  await pgClient.query('DELETE FROM "app"');

  await pgClient.end();
};
