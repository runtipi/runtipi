import { expect, test } from 'vitest';
import { createTestCache } from './cache-test-utils';
import { createSessionStore } from '@/modules/auth/__tests__/session-test-utils';

test.each(['%', '_', '!', '!%_'])('matches %s literally in cache prefixes', (prefix) => {
  const { cache } = createTestCache();
  cache.set(`${prefix}:first`, 'first');
  cache.set(`${prefix}:second`, 'second');
  cache.set('other:first', 'unrelated');
  cache.set('x:first', 'unrelated');

  expect(cache.getByPrefix(`${prefix}:`)).toEqual([
    { key: `${prefix}:first`, val: 'first' },
    { key: `${prefix}:second`, val: 'second' },
  ]);
  expect(cache.getByPrefix('missing:')).toEqual([]);
});

test.each(['%', '_', '!'])('logout with %s preserves other users’ app sessions and pending grants', async (sessionId) => {
  const { cache, sessions } = createSessionStore();
  const otherSessionId = await sessions.createSession(2);
  const grant = sessions.createForwardAuthGrant(otherSessionId, 'app.example.com')!;
  const appSession = sessions.consumeForwardAuthGrant(grant, 'app.example.com')!;
  const pendingGrant = sessions.createForwardAuthGrant(otherSessionId, 'pending.example.com')!;

  await sessions.deleteSession(sessionId);

  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')?.userId).toBe(2);
  expect(sessions.consumeForwardAuthGrant(pendingGrant, 'pending.example.com')).toBeDefined();

  await sessions.deleteSession(otherSessionId);

  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')).toBeUndefined();
  expect(cache.getByPrefix(`forward-auth-by-session:${otherSessionId}:`)).toEqual([]);
});

test('transactions commit their result and roll back failed writes and deletes', () => {
  const { cache } = createTestCache();
  cache.set('existing', 'original');

  expect(
    cache.transaction(() => {
      cache.set('committed', 'value');
      return 42;
    }),
  ).toBe(42);
  expect(cache.get('committed')).toBe('value');

  expect(() =>
    cache.transaction(() => {
      cache.del('existing');
      cache.set('uncommitted', 'value');
      throw new Error('failure');
    }),
  ).toThrow('failure');

  expect(cache.get('existing')).toBe('original');
  expect(cache.get('uncommitted')).toBeUndefined();

  cache.transaction(() => cache.set('after-rollback', 'value'));

  expect(cache.get('after-rollback')).toBe('value');
});
