import { DatabaseSync } from 'node:sqlite';
import { Injectable } from '@nestjs/common';

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

@Injectable()
export class CacheService {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync('/cache/cache.sqlite');

    const tableCheck = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").get();

    if (!tableCheck) {
      this.db.exec('CREATE TABLE keyv (key TEXT PRIMARY KEY, value TEXT)');
    }
  }

  public set(key: string, value: string, expiration = ONE_DAY_IN_SECONDS) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO keyv (key, value) VALUES (?, ?)');
    stmt.run(key, JSON.stringify({ value, expiration: Math.max(Date.now() + expiration * 1000, expiration) }));
  }

  public get(key: string) {
    const query = this.db.prepare('SELECT * FROM keyv WHERE key = ?');
    const row = query.get(key) as { value: string } | undefined;

    if (!row) {
      return undefined;
    }

    const { value, expiration = 0 } = JSON.parse(row.value) as { value: string; expiration: number };
    if (expiration < Date.now()) {
      this.del(key);
      return undefined;
    }

    return value;
  }

  public del(key: string) {
    const stmt = this.db.prepare('DELETE FROM keyv WHERE key = ?');
    stmt.run(key);
  }

  public async getByPrefix(prefix: string) {
    try {
      const query = this.db.prepare('SELECT * FROM keyv WHERE key LIKE ?');
      const rows = query.all(`cache:${prefix}%`) as { key: string; value: string }[];

      return rows.map((row) => ({ key: row.key, val: JSON.parse(row.value).value }));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public clear() {
    const stmt = this.db.prepare('DELETE FROM keyv');
    stmt.run();
  }
}
