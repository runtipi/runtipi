import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
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
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ArkValidationPipe());
    app.use(((req, _res, next) => {
      req.cookies = {};
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
});
