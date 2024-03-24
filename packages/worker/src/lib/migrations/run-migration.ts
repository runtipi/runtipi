import path from 'path';
import pg from 'pg';
import { migrate } from '@runtipi/postgres-migrations';
import { logger } from '@/lib/logger';
import { APP_DIR } from '@/config/constants';

type MigrationParams = {
  postgresHost: string;
  postgresDatabase: string;
  postgresUsername: string;
  postgresPassword: string;
  postgresPort: string;
};

export const runPostgresMigrations = async (params: MigrationParams) => {
  const assetsFolder = path.join(APP_DIR, 'assets');

  const { postgresHost, postgresDatabase, postgresUsername, postgresPassword, postgresPort } = params;

  logger.info('Starting database migration');

  logger.info(`Connecting to database ${postgresDatabase} on ${postgresHost} as ${postgresUsername} on port ${postgresPort}`);

  const client = new pg.Client({
    user: postgresUsername,
    host: postgresHost,
    database: postgresDatabase,
    password: postgresPassword,
    port: Number(postgresPort),
  });
  await client.connect();

  logger.info('Client connected');

  try {
    const { rows } = await client.query('SELECT * FROM migrations');
    // if rows contains a migration with name 'Initial1657299198975' (legacy typeorm) delete table migrations. As all migrations are idempotent we can safely delete the table and start over.
    if (rows.find((row) => row.name === 'Initial1657299198975')) {
      logger.info('Found legacy migration. Deleting table migrations');
      await client.query('DROP TABLE migrations');
    }
  } catch (e) {
    logger.info('Migrations table not found, creating it');
  }

  logger.info('Running migrations');
  try {
    await migrate({ client }, path.join(assetsFolder, 'migrations'), { skipCreateMigrationTable: true });
  } catch (e) {
    logger.error('Error running migrations. Dropping table migrations and trying again');
    await client.query('DROP TABLE migrations');
    await migrate({ client }, path.join(assetsFolder, 'migrations'), { skipCreateMigrationTable: true });
  }

  logger.info('Migration complete');
  await client.end();
};
