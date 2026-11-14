import { CacheService } from '@/core/cache/cache.service';
import { describe, expect, it, vi } from 'vitest';

vi.mock('node:sqlite', async (importOriginal) => {
  const { DatabaseSync } = await importOriginal<typeof import('node:sqlite')>();

  class TestDatabaseSync extends DatabaseSync {
    constructor() {
      super(':memory:');
    }
  }

  return { DatabaseSync: TestDatabaseSync };
});

describe('CacheService', () => {
  it('returns entries with the requested literal prefix', async () => {
    const cache = new CacheService();
    cache.set('forward-auth-by-session:session-a:grant:grant-a', 'forward-auth-grant:grant-a');
    cache.set('forward-auth-by-session:session-a:session:forward-session-a', 'forward-auth-session:forward-session-a');
    cache.set('forward-auth-by-session:session-b:session:forward-session-b', 'forward-auth-session:forward-session-b');

    const entries = await cache.getByPrefix('forward-auth-by-session:session-a:');

    expect(entries).toHaveLength(2);
    expect(entries).toEqual(
      expect.arrayContaining([
        { key: 'forward-auth-by-session:session-a:grant:grant-a', val: 'forward-auth-grant:grant-a' },
        { key: 'forward-auth-by-session:session-a:session:forward-session-a', val: 'forward-auth-session:forward-session-a' },
      ]),
    );
  });

  it.each([
    ['percent wildcard', '%', 'session-a'],
    ['underscore wildcards', '_'.repeat(36), '11111111-1111-4111-8111-111111111111'],
    ['escape marker followed by a percent wildcard', '!%', '!session-a'],
  ])('treats %s as literal text', async (_, requestedSessionId, storedSessionId) => {
    const cache = new CacheService();
    const literalKey = `forward-auth-by-session:${requestedSessionId}:session:literal-forward-session`;
    cache.set(literalKey, 'forward-auth-session:literal-forward-session');
    cache.set(`forward-auth-by-session:${storedSessionId}:session:forward-session`, 'forward-auth-session:forward-session');

    const entries = await cache.getByPrefix(`forward-auth-by-session:${requestedSessionId}:`);

    expect(entries).toEqual([{ key: literalKey, val: 'forward-auth-session:literal-forward-session' }]);
  });
});
