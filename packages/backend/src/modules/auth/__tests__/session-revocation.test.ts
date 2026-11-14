import { SESSION_COOKIE_NAME } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { PasswordService } from '@/core/password/password.service';
import { UserRepository } from '@/modules/user/user.repository';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ArkValidationPipe } from 'nestjs-arktype';
import request from 'supertest';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthController } from '../auth.controller';
import { AuthGuard } from '../auth.guard';
import { AuthMiddleware } from '../auth.middleware';
import { AuthService } from '../auth.service';
import { SessionCookies } from '../session-cookies';
import { SessionManager } from '../session.manager';
import { createSessionStore } from './session-test-utils';

const user = {
  id: 1,
  username: 'operator@example.com',
  password: 'hashed-password',
  createdAt: 1,
  updatedAt: 1,
  totpEnabled: false,
  totpSecret: null,
  salt: 'salt',
  locale: 'en',
  operator: true,
  hasSeenWelcome: true,
};

test.each([
  { method: 'post', path: '/auth/logout', body: {} },
  { method: 'patch', path: '/auth/password', body: { currentPassword: 'password', newPassword: 'new-password-123' } },
  { method: 'patch', path: '/auth/username', body: { password: 'password', newUsername: 'new@example.com' } },
] as const)('$path clears the cookie after renewal and prevents reuse of the session', async ({ method, path, body }) => {
  const store = createSessionStore();

  const config = mock<ConfigurationService>();
  config.get.mockReturnValue(false);

  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      AuthService,
      AuthMiddleware,
      AuthGuard,
      { provide: ConfigurationService, useValue: config },
      { provide: SessionManager, useValue: store.sessions },
      { provide: SessionCookies, useValue: new SessionCookies(store.config, store.sessions, mock()) },
    ],
  })
    .useMocker(mock)
    .compile();

  const repository = moduleRef.get(UserRepository);
  repository.getUserDtoById = async () => user;
  repository.getUserById = async () => user;

  const passwords = moduleRef.get(PasswordService);
  passwords.verify = async () => true;
  passwords.hash = async () => 'new-hash';

  const middleware = moduleRef.get(AuthMiddleware);
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ArkValidationPipe());
  app.use(cookieParser());
  app.use(middleware.use.bind(middleware));
  await app.init();

  try {
    const sessionId = await store.sessions.createSession(user.id);
    const cookie = `${SESSION_COOKIE_NAME}=${sessionId}`;
    const response = await request(app.getHttpServer())
      [method](path)
      .set('Host', 'localhost')
      .set('Origin', 'http://localhost')
      .set('Cookie', cookie)
      .send(body);

    expect(response.status).toBe(204);

    const sessionCookies = response.get('Set-Cookie')!.filter((value: string) => value.startsWith(`${SESSION_COOKIE_NAME}=`));

    expect(sessionCookies).toEqual([
      expect.stringContaining(`${SESSION_COOKIE_NAME}=${sessionId}; Max-Age=604800; Path=/;`),
      expect.stringContaining(`${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970`),
    ]);
    expect(sessionCookies.every((value: string) => !value.includes('Domain='))).toBe(true);
    expect(store.sessions.getSessionUserId(sessionId)).toBeUndefined();

    const followup = await request(app.getHttpServer())
      .post('/auth/forward-auth')
      .set('Cookie', cookie)
      .send({ redirectUrl: 'https://app.example.com' });

    expect(followup.status).toBe(401);
    expect(followup.headers['set-cookie']).toBeUndefined();
  } finally {
    await app.close();
  }
});
