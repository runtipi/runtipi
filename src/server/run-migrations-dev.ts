import path from 'node:path';
import { migrate } from '@runtipi/postgres-migrations';
import pg from 'pg';
import { createClient } from 'redis';
import { Logger } from './core/Logger';
import { TipiConfig } from './core/TipiConfig';

export const runPostgresMigrations = async (dbName?: string) => {
  Logger.info('Starting database migration');

  const { postgresHost, postgresDatabase, postgresUsername, postgresPassword, postgresPort } = TipiConfig.getConfig();

  Logger.info(`Connecting to database ${postgresDatabase} on ${postgresHost} as ${postgresUsername} on port ${postgresPort}`);

  const client = new pg.Client({
    user: postgresUsername,
    host: postgresHost,
    database: dbName || postgresDatabase,
    password: postgresPassword,
    port: Number(process.env.POSTGRES_PORT),
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
    await migrate({ client }, path.join(__dirname, '../../packages/db/assets/migrations'), { skipCreateMigrationTable: true });
  } catch (e) {
    Logger.error('Error running migrations. Dropping table migrations and trying again');
    await client.query('DROP TABLE migrations');
    await migrate({ client }, path.join(__dirname, '../../packages/db/assets/migrations'), { skipCreateMigrationTable: true });
  }

  Logger.info('Migration complete');
  await client.end();

  // Flush redis cache
  try {
    const cache = createClient({
      url: `redis://${TipiConfig.getConfig().REDIS_HOST}:6379`,
      password: TipiConfig.getConfig().redisPassword,
    });
    await cache.connect();
    await cache.flushAll();
    await cache.quit();
  } catch (e) {
    Logger.error('Error flushing redis cache');
  }
};

const main = async () => {
  await runPostgresMigrations();
};

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
