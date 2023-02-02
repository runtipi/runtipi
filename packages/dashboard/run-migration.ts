import path from 'path';
import pg from 'pg';
import { migrate } from '@runtipi/postgres-migrations';
import { Logger } from './src/server/core/Logger';

export const runPostgresMigrations = async (dbName?: string) => {
  Logger.info('Starting database migration');

  const { POSTGRES_HOST, POSTGRES_DBNAME, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_PORT = 5432 } = process.env;

  Logger.info('Connecting to database', POSTGRES_DBNAME, 'on', POSTGRES_HOST, 'as', POSTGRES_USERNAME, 'on port', POSTGRES_PORT);

  const client = new pg.Client({
    user: POSTGRES_USERNAME,
    host: POSTGRES_HOST,
    database: dbName || POSTGRES_DBNAME,
    password: POSTGRES_PASSWORD,
    port: Number(POSTGRES_PORT),
  });
  await client.connect();

  Logger.info('Client connected');

  try {
    const { rows } = await client.query('SELECT * FROM migrations');
    // if rows contains a migration with name 'Initial1657299198975' (legacy typeorm) delete table migrations. As all migrations are idempotent we can safely delete the table and start over.
    if (rows.find((row) => row.name === 'Initial1657299198975')) {
      Logger.info('Found legacy migration. Deleting table migrations');
      await client.query('DROP TABLE migrations');
    }
  } catch (e) {
    Logger.info('Migrations table not found, creating it');
  }

  Logger.info('Running migrations');
  try {
    await migrate({ client }, path.join(__dirname, 'migrations'), { skipCreateMigrationTable: true });
  } catch (e) {
    Logger.error('Error running migrations. Dropping table migrations and trying again');
    await client.query('DROP TABLE migrations');
    await migrate({ client }, path.join(__dirname, 'migrations'), { skipCreateMigrationTable: true });
  }

  Logger.info('Migration complete');
  await client.end();
};

runPostgresMigrations();
