import { randomUUID } from 'node:crypto';
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

  public reserveAttempt(key: string, limit: number, windowSeconds: number): string | undefined {
    this.db.exec('BEGIN IMMEDIATE');

    try {
      const row = this.db.prepare('SELECT value FROM keyv WHERE key = ?').get(key) as { value: string } | undefined;
      const now = Date.now();
      let state = { value: '0', expiration: now + windowSeconds * 1000, generation: randomUUID() };

      if (row) {
        const stored = JSON.parse(row.value);
        if (!Number.isFinite(stored.expiration) || typeof stored.generation !== 'string' || !/^\d+$/.test(stored.value)) {
          throw new Error('Invalid attempt budget');
        }
        if (stored.expiration > now) state = stored;
      }

      if (Number(state.value) >= limit) {
        this.db.exec('COMMIT');
        return undefined;
      }

      state.value = String(Number(state.value) + 1);
      this.db.prepare('INSERT OR REPLACE INTO keyv (key, value) VALUES (?, ?)').run(key, JSON.stringify(state));
      this.db.exec('COMMIT');

      return state.generation;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  public refundAttempt(key: string, generation: string) {
    this.db
      .prepare(
        `
      UPDATE keyv SET value = json_set(value, '$.value', CAST(CAST(json_extract(value, '$.value') AS INTEGER) - 1 AS TEXT))
      WHERE key = ? AND json_extract(value, '$.generation') = ? AND CAST(json_extract(value, '$.value') AS INTEGER) > 0
    `,
      )
      .run(key, generation);
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
