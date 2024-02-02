import pg from 'pg';
import * as Sentry from '@sentry/node';
import { getEnv } from '../environment';
import { logger } from '../logger';

class DbClientSingleton {
  private client: pg.Client | null;

  constructor() {
    this.client = null;
  }

  async connect() {
    if (!this.client) {
      try {
        const { postgresHost, postgresDatabase, postgresUsername, postgresPassword, postgresPort } = getEnv();

        this.client = new pg.Client({
          host: postgresHost,
          database: postgresDatabase,
          user: postgresUsername,
          password: postgresPassword,
          port: Number(postgresPort),
        });

        await this.client.connect();
        logger.info('Database connection successfully established.');
      } catch (error) {
        logger.error('Failed to connect to the database:', error);
        this.client = null; // Ensure client is null to retry connection on next call
        throw error; // Rethrow or handle error as needed
      }
    }

    this.client.on('error', (error) => {
      Sentry.captureException(error);
      logger.error('Database connection error:', error);
      this.client = null;
    });

    return this.client;
  }

  async getClient() {
    if (!this.client) {
      await this.connect();
    }

    return this.client;
  }
}

const dbClientSingleton = new DbClientSingleton();

export const getDbClient = async () => {
  return dbClientSingleton.getClient();
};
