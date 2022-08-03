import { DataSource } from 'typeorm';
import App from '../modules/apps/app.entity';
import User from '../modules/auth/user.entity';
import pg from 'pg';
import Update from '../modules/system/update.entity';

const HOST = 'localhost';
const USER = 'postgres';
const DATABASE = 'postgres';
const PASSWORD = 'postgres';
const PORT = 5433;

const pgClient = new pg.Client({
  user: USER,
  host: HOST,
  database: DATABASE,
  password: PASSWORD,
  port: PORT,
});

export const setupConnection = async (testsuite: string): Promise<DataSource> => {
  await pgClient.connect();

  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.query(`CREATE DATABASE ${testsuite}`);

  const AppDataSource = new DataSource({
    name: 'default',
    type: 'postgres',
    host: HOST,
    port: PORT,
    username: USER,
    password: PASSWORD,
    database: testsuite,
    dropSchema: true,
    logging: false,
    synchronize: true,
    entities: [App, User, Update],
  });

  return AppDataSource.initialize();
};

export const teardownConnection = async (testsuite: string): Promise<void> => {
  await pgClient.query(`DROP DATABASE IF EXISTS ${testsuite}`);
  await pgClient.end();
};
