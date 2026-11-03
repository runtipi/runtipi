import { afterEach, expect, test, vi } from 'vitest';
import { CacheService } from '../cache.service';

vi.mock('node:sqlite', async () => {
  const { createRequire } = await import('node:module');
  const sqlite: typeof import('node:sqlite') = createRequire(import.meta.url)('node:sqlite');

  return {
    ...sqlite,
    DatabaseSync: class extends sqlite.DatabaseSync {
      constructor() {
        super(':memory:');
      }
    },
  };
});

afterEach(() => vi.useRealTimers());

test('taking a cached capability removes it atomically and prevents reuse', () => {
  const cache = new CacheService();
  cache.set('transaction', 'value', 300);

  expect(cache.take('transaction')).toBe('value');
  expect(cache.take('transaction')).toBeUndefined();
  expect(cache.get('transaction')).toBeUndefined();
});

test('expired capabilities cannot be consumed', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const cache = new CacheService();
  cache.set('transaction', 'value', 300);
  vi.setSystemTime(Date.now() + 301_000);

  expect(cache.take('transaction')).toBeUndefined();
});
