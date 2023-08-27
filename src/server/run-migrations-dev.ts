import path from 'path';
import pg from 'pg';
import { migrate } from '@runtipi/postgres-migrations';
import { Logger } from './core/Logger';
import { getConfig } from './core/TipiConfig';

export const runPostgresMigrations = async (dbName?: string) => {
  Logger.info('Starting database migration');

  const { postgresHost, postgresDatabase, postgresUsername, postgresPassword, postgresPort } = getConfig();

  Logger.info(`Connecting to database ${postgresDatabase} on ${postgresHost} as ${postgresUsername} on port ${postgresPort}`);

  const client = new pg.Client({
    user: postgresUsername,
    host: postgresHost,
    database: dbName || postgresDatabase,
    password: postgresPassword,
    port: Number(postgresPort),
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
    await migrate({ client }, path.join(__dirname, '../../packages/cli/assets/migrations'), { skipCreateMigrationTable: true });
  } catch (e) {
    Logger.error('Error running migrations. Dropping table migrations and trying again');
    await client.query('DROP TABLE migrations');
    await migrate({ client }, path.join(__dirname, '../../packages/cli/assets/migrations'), { skipCreateMigrationTable: true });
  }

  Logger.info('Migration complete');
  await client.end();
};

const main = async () => {
  await runPostgresMigrations();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
