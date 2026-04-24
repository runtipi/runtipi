import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ArkValidationPipe } from 'nestjs-arktype';
import request from 'supertest';
import { expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthController } from '../auth.controller';
import { AuthGuard } from '../auth.guard';
import { AuthService } from '../auth.service';

it('throttles repeated login attempts before they reach the controller', async () => {
  let app: INestApplication | undefined;
  const authService = mock<AuthService>();
  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();

  authService.login.mockResolvedValue({ totpSessionId: '550e8400-e29b-41d4-a716-446655440000' });

  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
    controllers: [AuthController],
    providers: [
      AuthGuard,
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
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

  try {
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ArkValidationPipe());
    await app.init();

    for (let index = 0; index < 20; index += 1) {
      const response = await request(app.getHttpServer()).post('/auth/login').send({ username: 'operator@example.com', password: 'password' });

      expect(response.status).toBe(201);
    }

    const throttledResponse = await request(app.getHttpServer()).post('/auth/login').send({ username: 'operator@example.com', password: 'password' });

    expect(throttledResponse.status).toBe(429);
    expect(authService.login).toHaveBeenCalledTimes(20);
  } finally {
    if (app) {
      await app.close();
    }
  }
});

it('does not throttle repeated traefik auth checks', async () => {
  let app: INestApplication | undefined;
  const authService = mock<AuthService>();
  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();

  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
    controllers: [AuthController],
    providers: [
      AuthGuard,
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
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

  try {
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ArkValidationPipe());
    await app.init();

    for (let index = 0; index < 101; index += 1) {
      const response = await request(app.getHttpServer())
        .get('/auth/traefik')
        .set('x-forwarded-uri', '/')
        .set('x-forwarded-proto', 'https')
        .set('x-forwarded-host', 'app.example.com');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/login?redirect_url=https%3A%2F%2Fapp.example.com%2F&app=app');
    }
  } finally {
    if (app) {
      await app.close();
    }
  }
});
