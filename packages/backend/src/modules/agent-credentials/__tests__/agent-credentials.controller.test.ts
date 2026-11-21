import { Test } from '@nestjs/testing';
import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import { ArkValidationPipe } from 'nestjs-arktype';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import request from 'supertest';
import { LoggerService } from '@/core/logger/logger.service';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { AgentCredentialsController } from '../agent-credentials.controller';
import { AgentCredentialsService } from '../agent-credentials.service';

describe('agent credential management', () => {
  let app: INestApplication;
  const credentials = mock<AgentCredentialsService>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AgentCredentialsController],
      providers: [
        AuthGuard,
        { provide: AgentCredentialsService, useValue: credentials },
        { provide: LoggerService, useValue: mock<LoggerService>() },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ArkValidationPipe());
    app.use(((req, _res, next) => {
      if (req.headers.authorization === 'Bearer browser-session') {
        req.user = { id: 42 };
        req.authMethod = 'session';
      }
      if (req.headers.authorization === 'Bearer cli') {
        req.user = { id: 1 };
        req.authMethod = 'cli';
      }
      next();
    }) as NestMiddleware['use']);
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns only the session owner credentials and prevents caching', async () => {
    credentials.list.mockResolvedValue([]);
    const response = await request(app.getHttpServer()).get('/agent-credentials').set('Authorization', 'Bearer browser-session');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(credentials.list).toHaveBeenCalledWith(42);
  });

  it('rejects unauthenticated and CLI access', async () => {
    const anonymous = await request(app.getHttpServer()).get('/agent-credentials');
    const cli = await request(app.getHttpServer()).get('/agent-credentials').set('Authorization', 'Bearer cli');

    expect(anonymous.status).toBe(401);
    expect(cli.status).toBe(401);
  });

  it('preserves session CSRF checks on token creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/agent-credentials')
      .set('Host', 'localhost')
      .set('Authorization', 'Bearer browser-session')
      .send({ name: 'Agent', password: 'password' });

    expect(response.status).toBe(403);
    expect(credentials.create).not.toHaveBeenCalled();
  });

  it('validates expiry and trims the agent name before creation', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/agent-credentials')
      .set('Host', 'localhost')
      .set('Origin', 'http://localhost')
      .set('Authorization', 'Bearer browser-session')
      .send({ name: 'Agent', password: 'password', expiresInDays: 10000 });
    const valid = await request(app.getHttpServer())
      .post('/agent-credentials')
      .set('Host', 'localhost')
      .set('Origin', 'http://localhost')
      .set('Authorization', 'Bearer browser-session')
      .send({ name: ' Agent ', password: 'password' });

    expect(invalid.status).toBe(400);
    expect(valid.status).toBe(201);
    expect(credentials.create).toHaveBeenCalledWith(42, { name: 'Agent', password: 'password', expiresInDays: 90 });
  });
});
