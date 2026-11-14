import { DatabaseSync } from 'node:sqlite';
import { afterAll } from 'vitest';
import { CacheService } from '../cache.service';

const caches: CacheService[] = [];

afterAll(() => {
  for (const cache of caches) {
    cache.onModuleDestroy();
  }
});

export const createTestCache = () => {
  const database = new DatabaseSync(':memory:');
  const cache = new CacheService(database);
  caches.push(cache);

  return { cache, database };
};
