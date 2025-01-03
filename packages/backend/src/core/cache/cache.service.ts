import { Database } from 'bun:sqlite';
import KeyvSqlite from '@keyv/sqlite';
import { Injectable } from '@nestjs/common';
import Keyv from 'keyv';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

@Injectable()
export class CacheService {
  private client: Keyv<string>;
  private backend: KeyvSqlite;

  constructor() {
    this.backend = new KeyvSqlite('sqlite:///cache/cache.sqlite');
    this.client = new Keyv({
      store: this.backend,
      ttl: ONE_DAY_IN_SECONDS,
      namespace: 'cache',
    });
  }

  public getClient() {
    return this.client;
  }

  public set(key: string, value: string, expiration = ONE_DAY_IN_SECONDS) {
    return this.client.set(key, value, expiration * 1000);
  }

  public get(key: string) {
    return this.client.get<string>(key);
  }

  public del(key: string) {
    return this.client.delete(key);
  }

  public async getByPrefix(prefix: string) {
    const db = new Database('/cache/cache.sqlite');

    return new Promise<{ key: string; val: string }[]>((resolve) => {
      try {
        const query = db.query(`SELECT * FROM keyv WHERE key LIKE '$prefix%'`);
        const rows = query.all({ prefix: `cache:${prefix}` }) as { key: string; value: string }[];

        resolve(rows.map((row) => ({ key: row.key, val: JSON.parse(row.value).value })));
      } catch (error) {
        resolve([]);
      }
    });
  }

  public clear() {
    return this.client.clear();
  }
}
