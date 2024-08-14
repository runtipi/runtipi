import IORedis from 'ioredis';
import { vi } from 'vitest';
import type { ICache } from './cache';

export class CacheMock implements ICache {
  private values = new Map<string, string>();

  public set = vi.fn(async (key: string, value: string) => {
    this.values.set(key, value);
    return value;
  });

  public get = vi.fn(async (key: string) => this.values.get(key) || null);

  public del = vi.fn(async (key: string) => {
    this.values.delete(key);
    return 1;
  });

  public getByPrefix = vi.fn(async (prefix: string) => {
    const keys = Array.from(this.values.keys()).filter((key) => key.startsWith(prefix));
    return keys.map((key) => ({ key, val: this.values.get(key) || null }));
  });

  public close = vi.fn(async () => 'OK');

  public ttl = vi.fn(async () => -1);

  public clear = vi.fn(async () => {
    const keys = Array.from(this.values.keys());

    return Promise.all(keys.map((key) => this.del(key)));
  });

  public getClient = () => Promise.resolve(new IORedis());
}
