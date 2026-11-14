import { afterEach, expect, test, vi } from 'vitest';
import { createSessionStore } from './session-test-utils';

const DAY = 86_400_000;

afterEach(() => {
  vi.useRealTimers();
});

test.each(['dashboard', 'forward-auth'])('a failed %s renewal preserves the original expiration', async (method) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { cache, database, sessions, createForwardAuthSession } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const appSession = createForwardAuthSession(sessionId);
  const createdAt = Date.now();
  const failingPrefix = method === 'dashboard' ? 'session:1:*' : 'forward-auth-by-session:*';
  database.exec(`
    CREATE TRIGGER fail_renewal BEFORE INSERT ON keyv
    WHEN NEW.key GLOB '${failingPrefix}'
    BEGIN SELECT RAISE(ABORT, 'renewal failed'); END;
  `);

  vi.setSystemTime(createdAt + 6 * DAY);

  expect(() => {
    if (method === 'dashboard') {
      sessions.refreshSession(sessionId);
    } else {
      sessions.refreshForwardAuthSession(appSession, 'app.example.com');
    }
  }).toThrow('renewal failed');

  database.exec('DROP TRIGGER fail_renewal');
  expect(sessions.getSessionUserId(sessionId)).toBe(1);
  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')?.userId).toBe(1);

  vi.setSystemTime(createdAt + 7 * DAY + 1);

  expect(sessions.getSessionUserId(sessionId)).toBeUndefined();
  expect(cache.get(`session:1:${sessionId}`)).toBeUndefined();
  expect(cache.get(`forward-auth-session:${appSession}`)).toBeUndefined();
  expect(cache.get(`forward-auth-by-session:${sessionId}:session:${appSession}`)).toBeUndefined();
});

test('failed grant exchange rolls back consumption and can be retried exactly once', async () => {
  const { cache, database, sessions } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const grant = sessions.createForwardAuthGrant(sessionId, 'app.example.com')!;
  database.exec(`
    CREATE TRIGGER fail_exchange BEFORE INSERT ON keyv
    WHEN NEW.key GLOB 'forward-auth-by-session:*:session:*'
    BEGIN SELECT RAISE(ABORT, 'exchange failed'); END;
  `);

  expect(() => sessions.consumeForwardAuthGrant(grant, 'app.example.com')).toThrow('exchange failed');
  expect(cache.getByPrefix('forward-auth-session:')).toEqual([]);

  database.exec('DROP TRIGGER fail_exchange');
  const appSession = sessions.consumeForwardAuthGrant(grant, 'app.example.com')!;

  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')?.userId).toBe(1);
  expect(sessions.consumeForwardAuthGrant(grant, 'app.example.com')).toBeUndefined();
  expect(cache.getByPrefix('forward-auth-session:')).toHaveLength(1);
});

test.each(['single', 'all'])('failed %s-session revocation rolls back the login, app sessions and grants', async (scope) => {
  const { database, sessions, createForwardAuthSession } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const otherSessionId = await sessions.createSession(1);
  const appSession = createForwardAuthSession(sessionId);
  const otherAppSession = createForwardAuthSession(otherSessionId);
  const grant = sessions.createForwardAuthGrant(sessionId, 'pending.example.com')!;
  database.exec(`
    CREATE TRIGGER fail_revocation BEFORE DELETE ON keyv
    WHEN OLD.key GLOB 'forward-auth-session:*'
    BEGIN SELECT RAISE(ABORT, 'revocation failed'); END;
  `);

  const revoke = () => {
    if (scope === 'single') {
      sessions.deleteSession(sessionId);
    } else {
      sessions.destroyAllSessionsByUserId(1);
    }
  };

  expect(revoke).toThrow('revocation failed');
  expect(sessions.getSessionUserId(sessionId)).toBe(1);
  expect(sessions.getSessionUserId(otherSessionId)).toBe(1);
  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')?.userId).toBe(1);
  expect(sessions.getForwardAuthSession(otherAppSession, 'app.example.com')?.userId).toBe(1);

  database.exec('DROP TRIGGER fail_revocation');
  expect(sessions.consumeForwardAuthGrant(grant, 'pending.example.com')).toBeDefined();

  revoke();

  expect(sessions.getSessionUserId(sessionId)).toBeUndefined();
  expect(sessions.getForwardAuthSession(appSession, 'app.example.com')).toBeUndefined();
  expect(sessions.getSessionUserId(otherSessionId)).toBe(scope === 'single' ? 1 : undefined);
});
