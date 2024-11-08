import path from 'node:path';
import { migrate } from '@runtipi/postgres-migrations';
import pg from 'pg';

import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class DatabaseMigrator {
  constructor(
    private configurationService: ConfigurationService,
    private logger: LoggerService,
  ) {}

  public runPostgresMigrations = async (migrationsFolder: string) => {
    const { database, host, username, password, port } = this.configurationService.getConfig().database;

    this.logger.info('Starting database migration');

    this.logger.info(`Connecting to database ${database} on ${host} as ${username} on port ${port}`);

    const client = new pg.Client({ user: username, host, database, password, port: Number(port) });
    await client.connect();

    this.logger.info('Client connected');

    try {
      const { rows } = await client.query('SELECT * FROM migrations');
      // if rows contains a migration with name 'Initial1657299198975' (legacy typeorm) delete table migrations. As all migrations are idempotent we can safely delete the table and start over.
      if (rows.find((row) => row.name === 'Initial1657299198975')) {
        this.logger.info('Found legacy migration. Deleting table migrations');
        await client.query('DROP TABLE migrations');
      }
    } catch (e) {
      this.logger.info('Migrations table not found, creating it', e);
    }

    this.logger.info('Running migrations');
    try {
      await migrate({ client }, path.join(migrationsFolder, 'migrations'), { skipCreateMigrationTable: true });
    } catch (e) {
      this.logger.error('Error running migrations. Dropping table migrations and trying again', e);
      await client.query('DROP TABLE migrations');
      await migrate({ client }, path.join(migrationsFolder, 'migrations'), { skipCreateMigrationTable: true });
    }

    this.logger.info('Migration complete');
    await client.end();
  };
}
