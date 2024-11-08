import { Pool } from 'pg';
import * as schema from './schema';
import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { ConfigurationService } from '../config/configuration.service';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class DatabaseService {
  public db: NodePgDatabase<typeof schema>;

  constructor(
    private configurationService: ConfigurationService,
    private logger: LoggerService,
  ) {
    const { username, port, database, host, password } = this.configurationService.getConfig().database;
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
  }
}
