import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { Test } from '@nestjs/testing';
import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import { ArkValidationPipe } from 'nestjs-arktype';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthController } from '../auth.controller';
import { AuthGuard } from '../auth.guard';
import { AuthService } from '../auth.service';

const cliUser = {
  id: 1,
  username: 'operator@example.com',
  totpEnabled: false,
  locale: 'en',
  operator: true,
  hasSeenWelcome: true,
};

describe('AuthController reset-password security', () => {
  let app: INestApplication;
  const authService = mock<AuthService>();
  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  const cache = mock<CacheService>();

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
          provide: ConfigurationService,
          useValue: config,
        },
        {
          provide: CacheService,
          useValue: cache,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ArkValidationPipe());
    app.use(((req, _res, next) => {
      req.cookies = {};
      if (req.headers.cookie?.includes(`${SESSION_COOKIE_NAME}=session-id`)) {
        req.cookies[SESSION_COOKIE_NAME] = 'session-id';
        req.user = cliUser;
        req.authMethod = 'session';
      }
      if (req.headers.cookie?.includes(`${FORWARD_AUTH_COOKIE_NAME}=forward-session-id`)) {
        req.cookies[FORWARD_AUTH_COOKIE_NAME] = 'forward-session-id';
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

  beforeEach(() => {
    authService.changeOperatorPassword.mockReset();
    authService.cancelPasswordChangeRequest.mockReset();
    authService.checkPasswordChangeRequest.mockReset();
    authService.getCookieDomain.mockReset();
    authService.logout.mockReset();
    cache.set.mockReset();
    cache.del.mockReset();
    cache.getByPrefix.mockReset();
    config.get.mockReset();
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
    cache.getByPrefix.mockResolvedValue([
      { key: 'forward-auth-by-session:session-id:grant:grant-id', val: 'forward-auth-grant:grant-id' },
      { key: 'forward-auth-by-session:session-id:session:forward-session-id', val: 'forward-auth-session:forward-session-id' },
    ]);

    const response = await request(app.getHttpServer()).post('/auth/logout').set('Cookie', `${SESSION_COOKIE_NAME}=session-id`);

    expect(response.status).toBe(204);
    expect(cache.getByPrefix).toHaveBeenCalledWith('forward-auth-by-session:session-id:');
    expect(cache.del).toHaveBeenCalledWith('forward-auth-by-session:session-id:grant:grant-id');
    expect(cache.del).toHaveBeenCalledWith('forward-auth-grant:grant-id');
    expect(cache.del).toHaveBeenCalledWith('forward-auth-by-session:session-id:session:forward-session-id');
    expect(cache.del).toHaveBeenCalledWith('forward-auth-session:forward-session-id');
    expect(authService.logout).toHaveBeenCalledWith('session-id');
  });

  it('returns a one-time app-host redirect for safe forward-auth redirects', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'Example.COM')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=session-id`)
      .send({ redirectUrl: 'https://app.example.com' });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toBeUndefined();
    const redirectUrl = new URL(response.body.redirectUrl);
    expect(redirectUrl.origin).toBe('https://app.example.com');
    expect(redirectUrl.searchParams.get('runtipi_forward_auth')).toBeTruthy();
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^forward-auth-grant:/),
      JSON.stringify({ sessionId: 'session-id', host: 'app.example.com' }),
      60,
    );
  });

  it('creates separate grants for different app hosts', async () => {
    const firstResponse = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'example.com')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=session-id`)
      .send({ redirectUrl: 'https://app-one.example.com' });

    const secondResponse = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'example.com')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=session-id`)
      .send({ redirectUrl: 'https://app-two.example.com' });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(new URL(firstResponse.body.redirectUrl).hostname).toBe('app-one.example.com');
    expect(new URL(secondResponse.body.redirectUrl).hostname).toBe('app-two.example.com');
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^forward-auth-grant:/),
      JSON.stringify({ sessionId: 'session-id', host: 'app-one.example.com' }),
      60,
    );
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^forward-auth-grant:/),
      JSON.stringify({ sessionId: 'session-id', host: 'app-two.example.com' }),
      60,
    );
  });

  it('rejects forward-auth for unsafe redirects', async () => {
    authService.getCookieDomain.mockReturnValue('.example.com');

    const response = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Host', 'example.com')
      .set('Origin', 'http://example.com')
      .set('Cookie', `${SESSION_COOKIE_NAME}=session-id`)
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
      .set('Cookie', `${SESSION_COOKIE_NAME}=session-id`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/login?redirect_url=https%3A%2F%2Fapp.example.com%2F&app=app');
  });

  it('exchanges a one-time grant for a host-only forward-auth cookie on the app host', async () => {
    cache.get.mockImplementation((key: string) => {
      if (key === 'forward-auth-grant:grant-id') return JSON.stringify({ sessionId: 'session-id', host: 'app.example.com' });
      if (key === 'session:session-id') return '1';
      return undefined;
    });

    const response = await request(app.getHttpServer())
      .get('/auth/traefik')
      .set('X-Forwarded-Uri', '/?runtipi_forward_auth=grant-id')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://app.example.com/');
    expect(response.headers['set-cookie']?.[0]).toContain(`${FORWARD_AUTH_COOKIE_NAME}=`);
    expect(response.headers['set-cookie']?.[0]).not.toContain('Domain=');
    expect(cache.del).toHaveBeenCalledWith('forward-auth-grant:grant-id');
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^forward-auth-session:/),
      JSON.stringify({ sessionId: 'session-id', host: 'app.example.com' }),
      86_400,
    );
  });

  it('authorizes traefik auth checks with a forward-auth cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/traefik')
      .set('Cookie', `${SESSION_COOKIE_NAME}=session-id; ${FORWARD_AUTH_COOKIE_NAME}=forward-session-id`);

    expect(response.status).toBe(200);
  });
});
