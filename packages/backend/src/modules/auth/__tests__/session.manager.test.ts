import { afterEach, expect, test, vi } from 'vitest';
import { createSessionStore } from './session-test-utils';

const DAY = 86_400_000;

afterEach(() => {
  vi.useRealTimers();
});

test.each([1, 7, 14, 365])('sessions expire after %i configured days', async (days) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { sessions } = createSessionStore(days);
  const sessionId = await sessions.createSession(1);
  const createdAt = Date.now();

  vi.setSystemTime(createdAt + days * DAY - 1);
  expect(sessions.getSessionUserId(sessionId)).toBe(1);

  vi.setSystemTime(createdAt + days * DAY + 1);
  expect(sessions.getSessionUserId(sessionId)).toBeUndefined();
  expect(sessions.refreshSession(sessionId)).toBe(false);
});

test('dashboard activity slides the session expiration', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { sessions } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const createdAt = Date.now();

  vi.setSystemTime(createdAt + 6 * DAY);
  expect(sessions.refreshSession(sessionId)).toBe(true);

  vi.setSystemTime(createdAt + 12 * DAY);
  expect(sessions.getSessionUserId(sessionId)).toBe(1);

  vi.setSystemTime(createdAt + 13 * DAY + 1);
  expect(sessions.getSessionUserId(sessionId)).toBeUndefined();
});

test('forward-auth grants are single use and bound to their app host', async () => {
  const { sessions } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const grantId = sessions.createForwardAuthGrant(sessionId, 'APP.example.com')!;
  const forwardAuthSessionId = sessions.consumeForwardAuthGrant(grantId, 'app.example.com')!;

  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'APP.example.com')?.userId).toBe(1);
  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'other.example.com')).toBeUndefined();
  expect(sessions.getForwardAuthSession(forwardAuthSessionId, undefined)).toBeUndefined();
  expect(sessions.consumeForwardAuthGrant(grantId, 'app.example.com')).toBeUndefined();

  const wrongHostGrant = sessions.createForwardAuthGrant(sessionId, 'app.example.com')!;
  expect(sessions.consumeForwardAuthGrant(wrongHostGrant, 'other.example.com')).toBeUndefined();
  expect(sessions.consumeForwardAuthGrant(wrongHostGrant, 'app.example.com')).toBeUndefined();
});

test('unexchanged forward-auth grants expire after one minute', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { sessions } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const grantId = sessions.createForwardAuthGrant(sessionId, 'app.example.com')!;

  vi.setSystemTime(Date.now() + 60_001);

  expect(sessions.consumeForwardAuthGrant(grantId, 'app.example.com')).toBeUndefined();
});

test('app activity renews both sessions and cannot revive a revoked login', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { sessions, createForwardAuthSession } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const forwardAuthSessionId = createForwardAuthSession(sessionId);
  const createdAt = Date.now();

  vi.setSystemTime(createdAt + 6 * DAY);
  expect(sessions.refreshForwardAuthSession(forwardAuthSessionId, 'app.example.com')).toBe(true);

  vi.setSystemTime(createdAt + 12 * DAY);
  expect(sessions.getSessionUserId(sessionId)).toBe(1);
  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'app.example.com')?.userId).toBe(1);

  await sessions.deleteSession(sessionId);

  expect(sessions.refreshSession(sessionId)).toBe(false);
  expect(sessions.refreshForwardAuthSession(forwardAuthSessionId, 'app.example.com')).toBe(false);
  expect(sessions.createForwardAuthGrant(sessionId, 'app.example.com')).toBeUndefined();
});

test('a forward-auth session cannot outlive an inactive dashboard session', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { sessions, createForwardAuthSession } = createSessionStore(1);
  const sessionId = await sessions.createSession(1);
  const createdAt = Date.now();

  vi.setSystemTime(createdAt + DAY / 2);
  const forwardAuthSessionId = createForwardAuthSession(sessionId);

  vi.setSystemTime(createdAt + DAY + 1);

  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'app.example.com')).toBeUndefined();
  expect(sessions.refreshForwardAuthSession(forwardAuthSessionId, 'app.example.com')).toBe(false);
});

test('revoking all user sessions removes grants and app sessions without affecting another user', async () => {
  const { sessions, createForwardAuthSession } = createSessionStore();
  const firstSession = await sessions.createSession(1);
  const secondSession = await sessions.createSession(1);
  const otherSession = await sessions.createSession(2);
  const firstApp = createForwardAuthSession(firstSession);
  const secondApp = createForwardAuthSession(secondSession, 'other-app.example.com');
  const otherApp = createForwardAuthSession(otherSession);
  const pendingGrant = sessions.createForwardAuthGrant(firstSession, 'pending.example.com')!;

  await sessions.destroyAllSessionsByUserId(1);

  expect(sessions.getSessionUserId(firstSession)).toBeUndefined();
  expect(sessions.getSessionUserId(secondSession)).toBeUndefined();
  expect(sessions.getForwardAuthSession(firstApp, 'app.example.com')).toBeUndefined();
  expect(sessions.getForwardAuthSession(secondApp, 'other-app.example.com')).toBeUndefined();
  expect(sessions.consumeForwardAuthGrant(pendingGrant, 'pending.example.com')).toBeUndefined();
  expect(sessions.getForwardAuthSession(otherApp, 'app.example.com')?.userId).toBe(2);
});

test('removing one app session preserves the login and other apps', async () => {
  const { sessions, createForwardAuthSession } = createSessionStore();
  const sessionId = await sessions.createSession(1);
  const firstApp = createForwardAuthSession(sessionId);
  const secondApp = createForwardAuthSession(sessionId, 'other.example.com');

  sessions.deleteForwardAuthSession(firstApp);

  expect(sessions.getForwardAuthSession(firstApp, 'app.example.com')).toBeUndefined();
  expect(sessions.getForwardAuthSession(secondApp, 'other.example.com')?.userId).toBe(1);
  expect(sessions.getSessionUserId(sessionId)).toBe(1);
});
