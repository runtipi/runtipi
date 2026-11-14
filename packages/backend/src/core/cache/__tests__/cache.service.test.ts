import type { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, test, vi } from 'vitest';
import { CacheService } from '../cache.service';
import { SessionManager } from '@/modules/auth/session.manager';
import { createSessionStore } from '@/modules/auth/__tests__/session-test-utils';

const databases = vi.hoisted(() => [] as DatabaseSync[]);

vi.mock('node:sqlite', async (importOriginal) => {
  const sqlite = await importOriginal<typeof import('node:sqlite')>();

  return {
    DatabaseSync: class extends sqlite.DatabaseSync {
      constructor() {
        super(':memory:');
        databases.push(this);
      }
    },
  };
});

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

test.each(['%', '_', '!', '!%_'])('matches %s literally in cache prefixes', async (prefix) => {
  const cache = new CacheService();
  cache.set(`${prefix}:first`, 'first');
  cache.set(`${prefix}:second`, 'second');
  cache.set('other:first', 'unrelated');
  cache.set('x:first', 'unrelated');

  expect(await cache.getByPrefix(`${prefix}:`)).toEqual([
    { key: `${prefix}:first`, val: 'first' },
    { key: `${prefix}:second`, val: 'second' },
  ]);
  expect(await cache.getByPrefix('missing:')).toEqual([]);
});

test.each(['%', '_', '!'])('logout with %s preserves other users’ app sessions and pending grants', async (sessionId) => {
  const cache = new CacheService();
  const { config } = createSessionStore();
  const sessions = new SessionManager(cache, config);
  const otherSessionId = await sessions.createSession(2);
  const grant = sessions.createForwardAuthGrant(otherSessionId, 'app.example.com')!;
  const appSession = sessions.consumeForwardAuthGrant(grant, 'app.example.com')!;
  const pendingGrant = sessions.createForwardAuthGrant(otherSessionId, 'pending.example.com')!;

  await sessions.deleteSession(sessionId);

  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')?.userId).toBe(2);
  expect(sessions.consumeForwardAuthGrant(pendingGrant, 'pending.example.com')).toBeDefined();

  await sessions.deleteSession(otherSessionId);

  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')).toBeUndefined();
  expect(await cache.getByPrefix(`forward-auth-by-session:${otherSessionId}:`)).toEqual([]);
});
