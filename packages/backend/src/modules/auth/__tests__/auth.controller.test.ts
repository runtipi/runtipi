import { LoggerService } from '@/core/logger/logger.service';
import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { Test } from '@nestjs/testing';
import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import { ArkValidationPipe } from 'nestjs-arktype';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthController } from '../auth.controller';
import { AuthGuard } from '../auth.guard';
import { AuthService } from '../auth.service';
import { SessionManager } from '../session.manager';
import { SessionCookies } from '../session-cookies';
import { createSessionStore } from './session-test-utils';

const cliUser = {
  id: 1,
  username: 'operator@example.com',
  totpEnabled: false,
  locale: 'en',
  operator: true,
  hasSeenWelcome: true,
};

describe('AuthController', () => {
  let app: INestApplication;
  const authService = mock<AuthService>();
  const logger = mock<LoggerService>();
  const store = createSessionStore();
  let sessionId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
        {
          provide: SessionManager,
          useValue: store.sessions,
        },
        {
          provide: SessionCookies,
          useValue: new SessionCookies(store.config, store.sessions, logger),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ArkValidationPipe());
    app.use(cookieParser());
    app.use(((req, _res, next) => {
      if (req.cookies[SESSION_COOKIE_NAME] === sessionId) {
        req.user = cliUser;
        req.authMethod = 'session';
      }
      if (req.cookies[FORWARD_AUTH_COOKIE_NAME]) {
        req.user = cliUser;
        req.authMethod = 'forward-auth';
      }
      if (req.headers.authorization === 'Bearer cli-token') {
        req.user = cliUser;
        req.authMethod = 'cli';
      }
      next();
    }) as NestMiddleware['use']);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    authService.changeOperatorPassword.mockReset();
    authService.cancelPasswordChangeRequest.mockReset();
    authService.checkPasswordChangeRequest.mockReset();
    store.cache.clear();
    sessionId = await store.sessions.createSession(1);
  });

  it('does not expose a public password reset status endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/auth/reset-password');

    expect(response.status).toBe(404);
    expect(authService.checkPasswordChangeRequest).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated password reset completion attempts', async () => {
    const response = await request(app.getHttpServer()).post('/auth/reset-password').send({ newPassword: 'new-password-123' });

    expect(response.status).toBe(401);
    expect(authService.changeOperatorPassword).not.toHaveBeenCalled();
  });

  it('does not expose a public password reset cancellation endpoint', async () => {
    const response = await request(app.getHttpServer()).delete('/auth/reset-password');

    expect(response.status).toBe(404);
    expect(authService.cancelPasswordChangeRequest).not.toHaveBeenCalled();
  });

  it('allows authenticated password reset completion attempts', async () => {
    authService.changeOperatorPassword.mockResolvedValue({ email: 'operator@example.com' });

    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .set('Authorization', 'Bearer cli-token')
      .send({ newPassword: 'new-password-123' });

    expect(response.status).toBe(201);
    expect(authService.changeOperatorPassword).toHaveBeenCalledWith({ newPassword: 'new-password-123' });
  });

  it('revokes forward-auth grants and app-host sessions on logout', async () => {
    const forwardAuthSessionId = store.createForwardAuthSession(sessionId);
    const grantId = store.sessions.createForwardAuthGrant(sessionId, 'pending.example.com')!;

    const response = await request(app.getHttpServer()).post('/auth/logout').set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`);

    expect(response.status).toBe(204);
    expect(store.sessions.getSessionUserId(sessionId)).toBeUndefined();
    expect(store.sessions.getForwardAuthSession(forwardAuthSessionId, 'app.example.com')).toBeUndefined();
    expect(store.sessions.consumeForwardAuthGrant(grantId, 'pending.example.com')).toBeUndefined();
    expect(response.headers['set-cookie']).toContainEqual(expect.stringContaining(`${SESSION_COOKIE_NAME}=;`));
  });

  it('completes logout when the browser no longer has a session cookie', async () => {
    const response = await request(app.getHttpServer()).post('/auth/logout');

    expect(response.status).toBe(204);
    expect(response.headers['set-cookie']).toContainEqual(expect.stringContaining(`${SESSION_COOKIE_NAME}=;`));
  });

  it('returns a one-time app-host redirect for safe forward-auth redirects', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'Example.COM')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`)
      .send({ redirectUrl: 'https://app.example.com' });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toBeUndefined();
    const redirectUrl = new URL(response.body.redirectUrl);
    expect(redirectUrl.origin).toBe('https://app.example.com');
    expect(redirectUrl.searchParams.get('runtipi_forward_auth')).toBeTruthy();
    const grantId = redirectUrl.searchParams.get('runtipi_forward_auth')!;
    expect(store.sessions.consumeForwardAuthGrant(grantId, 'app.example.com')).toBeDefined();
  });

  it('creates separate grants for different app hosts', async () => {
    const firstResponse = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'example.com')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`)
      .send({ redirectUrl: 'https://app-one.example.com' });

    const secondResponse = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'example.com')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`)
      .send({ redirectUrl: 'https://app-two.example.com' });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(new URL(firstResponse.body.redirectUrl).hostname).toBe('app-one.example.com');
    expect(new URL(secondResponse.body.redirectUrl).hostname).toBe('app-two.example.com');
    const firstGrant = new URL(firstResponse.body.redirectUrl).searchParams.get('runtipi_forward_auth')!;
    const secondGrant = new URL(secondResponse.body.redirectUrl).searchParams.get('runtipi_forward_auth')!;
    expect(firstGrant).not.toBe(secondGrant);
    expect(store.sessions.consumeForwardAuthGrant(firstGrant, 'app-one.example.com')).toBeDefined();
    expect(store.sessions.consumeForwardAuthGrant(secondGrant, 'app-two.example.com')).toBeDefined();
  });

  it('rejects forward-auth for unsafe redirects', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'example.com')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`)
      .send({ redirectUrl: 'https://evil.com' });

    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('does not authorize traefik auth checks with a dashboard session cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/traefik')
      .set('X-Forwarded-Uri', '/')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/login?redirect_url=https%3A%2F%2Fapp.example.com%2F&app=app');
  });

  it('exchanges a one-time grant for a host-only forward-auth cookie on the app host', async () => {
    const grantId = store.sessions.createForwardAuthGrant(sessionId, 'app.example.com')!;
    const uri = `/?runtipi_forward_auth=${grantId}`;

    const response = await request(app.getHttpServer())
      .get('/auth/traefik')
      .set('X-Forwarded-Uri', uri)
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://app.example.com/');
    expect(response.headers['set-cookie']).toEqual([expect.stringContaining(`${FORWARD_AUTH_COOKIE_NAME}=`)]);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly; Secure; SameSite=Lax');
    expect(response.headers['set-cookie']?.[0]).not.toContain('Domain=');

    const replay = await request(app.getHttpServer())
      .get('/auth/traefik')
      .set('X-Forwarded-Uri', uri)
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com');

    expect(replay.headers.location).toContain('https://example.com/login?');
    expect(replay.headers['set-cookie']).toBeUndefined();
  });

  it('authorizes traefik auth checks with a forward-auth cookie', async () => {
    const forwardAuthSessionId = store.createForwardAuthSession(sessionId);
    const response = await request(app.getHttpServer())
      .get('/auth/traefik')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionId}; ${FORWARD_AUTH_COOKIE_NAME}=${forwardAuthSessionId}`);

    expect(response.status).toBe(200);
  });
});
