import { LoggerService } from '@/core/logger/logger.service';
import { Test } from '@nestjs/testing';
import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthGuard } from '../../auth/auth.guard';
import { SystemController } from '../system.controller';
import { SystemService } from '../system.service';

describe('SystemController certificate security', () => {
  let app: INestApplication;
  const systemService = mock<SystemService>();
  const logger = mock<LoggerService>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        AuthGuard,
        {
          provide: SystemService,
          useValue: systemService,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(((req, _res, next) => {
      if (req.headers.authorization === 'Bearer cli-token') {
        req.user = { id: 1 };
      }
      next();
    }) as NestMiddleware['use']);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    systemService.getLocalCertificate.mockReset();
  });

  it('allows unauthenticated certificate downloads', async () => {
    systemService.getLocalCertificate.mockResolvedValue('test-certificate');

    const response = await request(app.getHttpServer()).get('/system/certificate');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-pem-file');
    expect(response.headers['content-disposition']).toBe('attachment; filename=cert.pem');
    expect(response.text).toBe('test-certificate');
  });

  it('allows authenticated certificate downloads', async () => {
    systemService.getLocalCertificate.mockResolvedValue('test-certificate');

    const response = await request(app.getHttpServer()).get('/system/certificate').set('Authorization', 'Bearer cli-token');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-pem-file');
    expect(response.headers['content-disposition']).toBe('attachment; filename=cert.pem');
    expect(response.text).toBe('test-certificate');
  });
});
