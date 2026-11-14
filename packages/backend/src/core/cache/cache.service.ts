import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

@Injectable()
export class CacheService implements OnModuleDestroy {
  private setStatement: StatementSync;

  constructor(private db: DatabaseSync) {
    this.db.exec('CREATE TABLE IF NOT EXISTS keyv (key TEXT PRIMARY KEY, value TEXT)');

    this.setStatement = this.db.prepare('INSERT OR REPLACE INTO keyv (key, value) VALUES (?, ?)');
  }

  public set(key: string, value: string, expiration = ONE_DAY_IN_SECONDS) {
    this.setStatement.run(key, JSON.stringify({ value, expiration: Math.max(Date.now() + expiration * 1000, expiration) }));
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

  public getByPrefix(prefix: string) {
    const query = this.db.prepare("SELECT * FROM keyv WHERE key LIKE ? ESCAPE '!'");
    const rows = query.all(`${prefix.replace(/[!%_]/g, '!$&')}%`) as { key: string; value: string }[];

    return rows.map((row) => ({ key: row.key, val: JSON.parse(row.value).value as string }));
  }

  public transaction<T>(operation: () => T extends PromiseLike<unknown> ? never : T): T {
    this.db.exec('BEGIN IMMEDIATE');

    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  public onModuleDestroy() {
    this.db.close();
  }

  public clear() {
    const stmt = this.db.prepare('DELETE FROM keyv');
    stmt.run();
  }
}
