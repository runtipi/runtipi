import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { ConfigurationService } from '../config/configuration.service';
import { LoggerService } from '../logger/logger.service';
import * as schema from './drizzle/schema';

@Injectable()
export class DatabaseService {
  public db: NodePgDatabase<typeof schema>;

  constructor(
    private configurationService: ConfigurationService,
    private logger: LoggerService,
  ) {
    const { username, port, database, host, password } = this.configurationService.getConfig().database;
    const { appDir } = this.configurationService.getConfig().directories;
    const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}?connect_timeout=300`;

    const pool = new Pool({
      connectionString,
    });

    pool.on('error', async (err) => {
      this.logger.error('Unexpected error on idle client:', err);
    });

    pool.on('connect', () => {
      this.logger.debug('Connected to the database successfully.');
    });

    pool.on('remove', () => {
      this.logger.debug('Client removed from the pool.');
    });

    this.db = drizzle(pool, { schema });

    migrate(this.db, { migrationsFolder: path.join(appDir, 'assets', 'migrations') });
  }
}
