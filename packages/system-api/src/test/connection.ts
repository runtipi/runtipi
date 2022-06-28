import { DataSource } from 'typeorm';
import App from '../modules/apps/app.entity';
import User from '../modules/auth/user.entity';
import pg from 'pg';

const pgClient = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

export const setupConnection = async (testsuite: string): Promise<DataSource> => {
  await pgClient.connect();

  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.query(`CREATE DATABASE ${testsuite}`);

  const AppDataSource = new DataSource({
    name: 'default',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: testsuite,
    dropSchema: true,
    logging: false,
    synchronize: true,
    entities: [App, User],
  });

  return AppDataSource.initialize();
};

export const teardownConnection = async (testsuite: string): Promise<void> => {
  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.end();
};
