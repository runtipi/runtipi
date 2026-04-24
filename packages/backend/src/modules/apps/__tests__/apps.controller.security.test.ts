import { LoggerService } from '@/core/logger/logger.service';
import { createMockApp, createMockAppInfo } from '@/tests/helpers/app-mocks';
import { Test } from '@nestjs/testing';
import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthGuard } from '../../auth/auth.guard';
import { AppsController } from '../apps.controller';
import { AppsService } from '../apps.service';

describe('AppsController guest dashboard security', () => {
  let app: INestApplication;
  const appsService = mock<AppsService>();
  const logger = mock<LoggerService>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppsController],
      providers: [
        AuthGuard,
        {
          provide: AppsService,
          useValue: appsService,
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
    appsService.getGuestDashboardApps.mockReset();
    appsService.getInstalledApps.mockReset();
  });

  it('does not expose app config on the guest dashboard endpoint', async () => {
    appsService.getGuestDashboardApps.mockResolvedValue([
      {
        app: createMockApp({
          config: { appKey: 'super-secret', password: 'secret-password' },
          isVisibleOnGuestDashboard: true,
        }),
        info: createMockAppInfo({ categories: ['utilities'] }),
        metadata: { latestVersion: 1, latestDockerVersion: '1.0.0', localSubdomain: 'guest-app' },
      },
    ]);

    const response = await request(app.getHttpServer()).get('/apps/guest');

    expect(response.status).toBe(200);
    expect(response.body.installed[0].app.config).toBeUndefined();
  });

  it('keeps app config on the authenticated installed apps endpoint', async () => {
    appsService.getInstalledApps.mockResolvedValue([
      {
        app: createMockApp({
          config: { appKey: 'super-secret', password: 'secret-password' },
        }),
        info: createMockAppInfo({ categories: ['utilities'] }),
        metadata: { latestVersion: 1, latestDockerVersion: '1.0.0', localSubdomain: 'installed-app' },
      },
    ]);

    const response = await request(app.getHttpServer()).get('/apps/installed').set('Authorization', 'Bearer cli-token');

    expect(response.status).toBe(200);
    expect(response.body.installed[0].app.config).toEqual({
      appKey: 'super-secret',
      password: 'secret-password',
    });
  });
});
