import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type IDatabase = NodePgDatabase<typeof schema>;

type IConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

export interface IDbClient {
  db: IDatabase;
}

export class DbClient {
  public db: IDatabase;

  constructor(config: IConfig) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?connect_timeout=300`;
    const pool = new Pool({
      connectionString,
    });

    this.db = drizzle(pool, { schema });
  }
}
