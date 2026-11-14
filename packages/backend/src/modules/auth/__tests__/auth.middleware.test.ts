import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { LoggerService } from '@/core/logger/logger.service';
import { UserRepository } from '@/modules/user/user.repository';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { afterEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthMiddleware } from '../auth.middleware';
import { SessionCookies } from '../session-cookies';
import { createSessionStore } from './session-test-utils';

const setup = async () => {
  const store = createSessionStore();
  const sessionId = await store.sessions.createSession(1);
  const user = { id: 1, username: 'operator@example.com', totpEnabled: false, locale: 'en', operator: true, hasSeenWelcome: true };
  const users = mock<UserRepository>();
  users.getUserDtoById.mockResolvedValue(user);

  const cookies = new SessionCookies(store.config, store.sessions, mock<LoggerService>());
  const middleware = new AuthMiddleware(store.sessions, store.config, users, cookies);
  const app = express();
  app.use(cookieParser());
  app.use(middleware.use.bind(middleware));
  app.use((req, res) => {
    res.status(req.user ? 200 : 401).json({ user: req.user, authMethod: req.authMethod });
  });

  return { ...store, app, sessionId, user, users };
};

afterEach(() => {
  vi.useRealTimers();
});

test('dashboard requests renew the session and issue a host-only cookie', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { app, sessions, sessionId, user } = await setup();
  const createdAt = Date.now();
  vi.setSystemTime(createdAt + 6 * 86_400_000);

  const response = await request(app).get('/api/system/load').set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`).set('X-Forwarded-Proto', 'https');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ user, authMethod: 'session' });
  expect(response.headers['set-cookie']).toContainEqual(expect.stringContaining(`${SESSION_COOKIE_NAME}=${sessionId}; Max-Age=604800`));

  vi.setSystemTime(createdAt + 12 * 86_400_000);
  expect(sessions.getSessionUserId(sessionId)).toBe(1);
});

test('expired dashboard requests remain unauthenticated and receive no cookie', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { app, sessionId } = await setup();
  vi.setSystemTime(Date.now() + 7 * 86_400_000 + 1);

  const response = await request(app).get('/api/system/load').set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`);

  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
});

test('Traefik checks ignore dashboard cookies', async () => {
  const { app, sessionId } = await setup();

  const response = await request(app).get('/auth/traefik').set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`);

  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
});

test.each(['/auth/traefik', '/api/auth/traefik?check=1'])('app activity at %s renews both sessions and only the app cookie', async (path) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const { app, sessions, sessionId, createForwardAuthSession } = await setup();
  const forwardAuthSessionId = createForwardAuthSession(sessionId);
  const createdAt = Date.now();
  vi.setSystemTime(createdAt + 6 * 86_400_000);

  const response = await request(app)
    .get(path)
    .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}; ${FORWARD_AUTH_COOKIE_NAME}=${forwardAuthSessionId}`)
    .set('X-Forwarded-Host', 'app.example.com')
    .set('X-Forwarded-Proto', 'https');

  expect(response.status).toBe(200);
  expect(response.body.authMethod).toBe('forward-auth');
  expect(response.headers['set-cookie']).toEqual([
    expect.stringContaining(`${FORWARD_AUTH_COOKIE_NAME}=${forwardAuthSessionId}; Max-Age=604800; Path=/; Expires=`),
  ]);
  expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly; Secure; SameSite=Lax');
  expect(response.headers['set-cookie']?.[0]).not.toContain('Domain=');

  vi.setSystemTime(createdAt + 12 * 86_400_000);
  expect(sessions.getSessionUserId(sessionId)).toBe(1);
  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'app.example.com')?.userId).toBe(1);
});

test.each(['other.example.com', ''])('forward-auth cookies cannot be used with the host "%s"', async (host) => {
  const { app, sessions, sessionId, createForwardAuthSession } = await setup();
  const forwardAuthSessionId = createForwardAuthSession(sessionId);

  const response = await request(app)
    .get('/auth/traefik')
    .set('Cookie', `${FORWARD_AUTH_COOKIE_NAME}=${forwardAuthSessionId}`)
    .set('X-Forwarded-Host', host);

  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'app.example.com')?.userId).toBe(1);
});

test('a dashboard session ID cannot be used as a forward-auth cookie', async () => {
  const { app, sessionId } = await setup();

  const response = await request(app)
    .get('/auth/traefik')
    .set('Cookie', `${FORWARD_AUTH_COOKIE_NAME}=${sessionId}`)
    .set('X-Forwarded-Host', 'app.example.com');

  expect(response.status).toBe(401);
});

test.each(['session', 'forward-auth'])('a %s request cannot renew a login revoked during user lookup', async (method) => {
  const { app, sessions, sessionId, user, users, createForwardAuthSession } = await setup();
  const forwardAuthSessionId = createForwardAuthSession(sessionId);
  users.getUserDtoById.mockImplementation(async () => {
    await sessions.deleteSession(sessionId);
    return user;
  });

  let path = '/api/system/load';
  let cookie = `${SESSION_COOKIE_NAME}=${sessionId}`;

  if (method === 'forward-auth') {
    path = '/auth/traefik';
    cookie = `${FORWARD_AUTH_COOKIE_NAME}=${forwardAuthSessionId}`;
  }

  const response = await request(app).get(path).set('Cookie', cookie).set('X-Forwarded-Host', 'app.example.com');

  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
  expect(sessions.getForwardAuthSession(forwardAuthSessionId, 'app.example.com')).toBeUndefined();
});

test('sessions for a missing user are not renewed', async () => {
  const { app, sessionId, users } = await setup();
  users.getUserDtoById.mockResolvedValue(undefined);

  const response = await request(app).get('/api/system/load').set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`);

  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
});
