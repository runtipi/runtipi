import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { LoggerService } from '@/core/logger/logger.service';
import express from 'express';
import request from 'supertest';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SessionCookies } from '../session-cookies';
import { createSessionStore } from './session-test-utils';

const setup = (days = 7) => {
  const store = createSessionStore(days);
  const logger = mock<LoggerService>();
  const cookies = new SessionCookies(store.config, store.sessions, logger);
  const app = express();
  app.get('/session', (req, res) => {
    cookies.setSession(res, 'session-id', req);
    res.sendStatus(200);
  });
  app.get('/forward-auth', (req, res) => {
    cookies.setForwardAuth(res, 'app-session-id', req);
    res.sendStatus(200);
  });
  app.post('/logout', (req, res) => {
    cookies.clear(res, req);
    res.sendStatus(204);
  });

  return { ...store, app, logger };
};

test.each(['example.duckdns.org', 'example.whatever', 'sub.sub.duckdns.org'])(
  'clears legacy cookies on %s and issues a host-only dashboard cookie',
  async (host) => {
    const { app } = setup();

    const response = await request(app).get('/session').set('X-Forwarded-Host', host).set('X-Forwarded-Proto', 'https');

    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining(`${SESSION_COOKIE_NAME}=; Domain=.${host};`),
      expect.stringContaining(`${SESSION_COOKIE_NAME}=session-id; Max-Age=604800; Path=/; Expires=`),
    ]);
    expect(response.headers['set-cookie']?.[1]).toContain('HttpOnly; Secure; SameSite=Lax');
    expect(response.headers['set-cookie']?.[1]).not.toContain('Domain=');
  },
);

test.each(['localhost', '192.168.3.20'])('does not create domain cookies for %s', async (host) => {
  const { app } = setup();

  const response = await request(app).get('/session').set('Host', host);

  expect(response.headers['set-cookie']).toEqual([expect.stringContaining(`${SESSION_COOKIE_NAME}=session-id; Max-Age=604800;`)]);
  expect(response.headers['set-cookie']?.[0]).not.toContain('Domain=');
  expect(response.headers['set-cookie']?.[0]).not.toContain('Secure');
});

test.each([1, 14, 365])('both cookies use the configured %i-day lifetime', async (days) => {
  const { app } = setup(days);

  for (const path of ['/session', '/forward-auth']) {
    const response = await request(app).get(path).set('Host', 'localhost');

    expect(response.headers['set-cookie']).toEqual([expect.stringContaining(`Max-Age=${days * 86_400};`)]);
  }
});

test('preserves the explicit insecure dashboard cookie setting', async () => {
  const { app, settings } = setup();
  settings.experimental.insecureCookie = true;

  const response = await request(app).get('/session').set('X-Forwarded-Proto', 'https');

  expect(response.headers['set-cookie']).toEqual([expect.stringContaining(`${SESSION_COOKIE_NAME}=session-id; Max-Age=604800;`)]);
  expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  expect(response.headers['set-cookie']?.[0]).not.toMatch(/Secure|SameSite/);
});

test('logout expires host-only and legacy cookies', async () => {
  const { app } = setup();

  const response = await request(app).post('/logout').set('Host', 'example.com');

  expect(response.headers['set-cookie']).toEqual([
    expect.stringContaining(`${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970`),
    expect.stringContaining(`${FORWARD_AUTH_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970`),
    expect.stringContaining(`${SESSION_COOKIE_NAME}=; Domain=.example.com;`),
    expect.stringContaining(`${FORWARD_AUTH_COOKIE_NAME}=; Domain=.example.com;`),
  ]);
});

test('warns once while continuing to renew insecure dashboard cookies', async () => {
  const { app, settings, logger } = setup();
  settings.experimental.insecureCookie = true;

  for (let requestNumber = 0; requestNumber < 3; requestNumber++) {
    const response = await request(app).get('/session').set('X-Forwarded-Proto', 'https');

    expect(response.headers['set-cookie']).toEqual([expect.stringContaining(`${SESSION_COOKIE_NAME}=session-id; Max-Age=604800;`)]);
    expect(response.headers['set-cookie']?.[0]).not.toMatch(/Secure|SameSite/);
  }

  expect(logger.warn).toHaveBeenCalledExactlyOnceWith('WARNING: Using insecure cookies. This is not recommended for production environments.');
});
