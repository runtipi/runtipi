import { SESSION_COOKIE_NAME } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { SessionManager } from '@/modules/auth/session.manager';
import { PasswordService } from '@/core/password/password.service';
import { UserRepository } from '@/modules/user/user.repository';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { fromPartial } from '@total-typescript/shoehorn';
import { ArkValidationPipe } from 'nestjs-arktype';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { OIDCController } from '../oidc.controller';
import { OIDCRepository } from '../oidc.repository';
import { OIDCService } from '../oidc.service';
import { codes, idp, provider, setup as setupOIDC } from './oidc.fixture';

const apps: INestApplication[] = [];
const cookies = (response: request.Response) => {
  const values: unknown = response.headers['set-cookie'];
  if (!Array.isArray(values)) throw new Error('Expected response cookies');

  return values.filter((value): value is string => typeof value === 'string');
};
beforeAll(() => idp.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  codes.clear();
  idp.resetHandlers();
});
afterAll(() => idp.close());

const setup = async (totpEnabled = false) => {
  const oidc = setupOIDC();
  const users = mock<UserRepository>();
  users.getUserById.mockResolvedValue(fromPartial({ id: 1, password: 'hash', totpEnabled }));
  const config = mock<ConfigurationService>();
  config.get.mockReturnValue(fromPartial({ experimental: { insecureCookie: false } }));
  const passwords = mock<PasswordService>();
  passwords.verify.mockResolvedValue(true);
  const sessions = mock<SessionManager>();
  sessions.createSession.mockResolvedValue('00000000-0000-4000-8000-000000000001');

  const module = await Test.createTestingModule({
    controllers: [OIDCController],
    providers: [
      AuthService,
      AuthGuard,
      { provide: OIDCService, useValue: oidc.service },
      { provide: OIDCRepository, useValue: oidc.repository },
      { provide: CacheService, useValue: oidc.cache },
      { provide: UserRepository, useValue: users },
      { provide: ConfigurationService, useValue: config },
      { provide: PasswordService, useValue: passwords },
      { provide: SessionManager, useValue: sessions },
    ],
  })
    .useMocker(mock)
    .compile();

  const app = module.createNestApplication();
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ArkValidationPipe());
  app.use(cookieParser());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.cookies[SESSION_COOKIE_NAME] === 'operator-session') {
      req.user = fromPartial({ id: 1, operator: true });
      req.authMethod = 'session';
    }
    next();
  });
  await app.init();
  apps.push(app);

  const begin = async (path = 'url', body: object = {}, cookie = '') => {
    const response = await request(app.getHttpServer())
      .post(`/api/oidc/providers/example/${path}`)
      .set('Host', 'tipi.example')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://tipi.example')
      .set('Cookie', cookie)
      .send(body);
    const url = new URL(response.body.url);
    const state = url.searchParams.get('state') ?? '';

    return { response, authorization: { url: url.href, state } };
  };
  const complete = (authorization: { url: string; state: string }, cookie: string) => {
    const url = oidc.responseFor(authorization);

    return request(app.getHttpServer())
      .get(`${url.pathname}${url.search}`)
      .set('Host', 'tipi.example')
      .set('X-Forwarded-Proto', 'https')
      .set('Cookie', cookie);
  };

  return { ...oidc, app, begin, complete, passwords, sessions };
};

test('public HTTP provider discovery never emits credentials or private fields', async () => {
  const { app, repository } = await setup();
  repository.getOIDCProviders.mockResolvedValue([provider]);

  const response = await request(app.getHttpServer()).get('/api/oidc/providers/login');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ providers: [{ slug: 'example', displayName: 'Example' }] });
});

test('login creates a short-lived protected transaction cookie and a host-only session', async () => {
  const { begin, complete } = await setup();
  const { response, authorization } = await begin();

  expect(response.status).toBe(201);
  expect(cookies(response).join('; ')).toContain('__Host-runtipi-oidc=');
  expect(cookies(response).join('; ')).toContain('Max-Age=300');
  expect(cookies(response).join('; ')).toContain('HttpOnly; Secure; SameSite=Lax');
  expect(cookies(response).join('; ')).not.toContain('Domain=');

  const callback = await complete(authorization, `__Host-runtipi-oidc=${authorization.state}`);
  const sessionCookie = cookies(callback).find((cookie: string) => cookie.includes('00000000-0000-4000-8000-000000000001'));

  expect(callback.status).toBe(302);
  expect(callback.headers.location).toBe('/dashboard');
  expect(sessionCookie).toContain('HttpOnly; Secure; SameSite=Lax');
  expect(sessionCookie).not.toContain('Domain=');
});

test('OIDC preserves the existing local TOTP gate without creating a full session', async () => {
  const { begin, complete, sessions } = await setup(true);
  const { authorization } = await begin('url', { redirectUrl: 'https://app.tipi.example/private' });
  const callback = await complete(authorization, `__Host-runtipi-oidc=${authorization.state}`);
  const destination = new URL(callback.headers.location ?? '', 'https://tipi.example');

  expect(destination.pathname).toBe('/login');
  expect(destination.searchParams.get('redirect_url')).toBe('https://app.tipi.example/private');
  expect(new URLSearchParams(destination.hash.slice(1)).get('totp_session_id')).toMatch(/^[a-f0-9-]{36}$/);
  expect(sessions.createSession).not.toHaveBeenCalled();
});

test('OIDC returns through the existing app-host forward-auth handoff', async () => {
  const { begin, complete } = await setup();
  const { authorization } = await begin('url', { redirectUrl: 'https://app.tipi.example/private' });
  const callback = await complete(authorization, `__Host-runtipi-oidc=${authorization.state}`);
  const destination = new URL(callback.headers.location ?? '', 'https://tipi.example');

  expect(destination.pathname).toBe('/login');
  expect(destination.searchParams.get('redirect_url')).toBe('https://app.tipi.example/private');
});

test('linking requires a same-origin authenticated POST and password confirmation', async () => {
  const { app, begin, complete, repository } = await setup();
  const rejected = await request(app.getHttpServer())
    .post('/api/oidc/providers/example/link')
    .set('Host', 'tipi.example')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://attacker.example')
    .set('Cookie', 'runtipi-sid=operator-session')
    .send({ password: 'password' });
  expect(rejected.status).toBe(403);

  const { authorization } = await begin('link', { password: 'password' }, 'runtipi-sid=operator-session');
  const callback = await complete(authorization, `__Host-runtipi-oidc=${authorization.state}; runtipi-sid=operator-session`);

  expect(callback.headers.location).toBe('/settings?tab=security&sub_created=true');
  expect(repository.linkIdentity).toHaveBeenCalledWith(provider.id, provider.version, 'operator-subject', 1);
});

test('invalid local credentials cannot initiate identity linking', async () => {
  const { app, passwords } = await setup();
  passwords.verify.mockResolvedValue(false);

  const response = await request(app.getHttpServer())
    .post('/api/oidc/providers/example/link')
    .set('Host', 'tipi.example')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://tipi.example')
    .set('Cookie', 'runtipi-sid=operator-session')
    .send({ password: 'wrong' });

  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
});

test('attacker callback cannot link an identity in an operator browser', async () => {
  const { begin, complete, repository } = await setup();
  const { authorization } = await begin();
  const response = await complete(authorization, 'runtipi-sid=operator-session');

  expect(response.headers.location).toBe('/error?error=AUTH_ERROR_OIDC&redirect_to=login');
  expect(repository.linkIdentity).not.toHaveBeenCalled();
});

test('OpenAPI keeps provider secrets out of response contracts and separates linking from login', async () => {
  const { app } = await setup();
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Runtipi API').setVersion('1.0').build(), {
    operationIdFactory: (_controller, method) => method,
  });
  const schemas = document.components?.schemas;

  expect(schemas?.GetOIDCProviderDto).not.toHaveProperty('properties.clientSecret');
  expect(schemas?.LinkOIDCProviderBody).toHaveProperty('properties.password');
  expect(schemas?.EditOIDCProviderDto).not.toHaveProperty('required', expect.arrayContaining(['clientSecret']));
  expect(document.paths['/api/oidc/providers/{slug}/link']?.post?.operationId).toBe('linkProvider');
});
