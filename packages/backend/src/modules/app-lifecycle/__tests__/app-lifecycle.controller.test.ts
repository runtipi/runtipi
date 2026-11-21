import { LoggerService } from '@/core/logger/logger.service';
import { Test } from '@nestjs/testing';
import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthGuard } from '../../auth/auth.guard';
import { AppLifecycleController } from '../app-lifecycle.controller';
import { AppLifecycleService } from '../app-lifecycle.service';
import { AppJobService } from '../services/app-job.service';

describe('AppLifecycleController update', () => {
  let app: INestApplication;
  const appLifecycleService = mock<AppLifecycleService>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppLifecycleController],
      providers: [
        AuthGuard,
        {
          provide: AppLifecycleService,
          useValue: appLifecycleService,
        },
        {
          provide: LoggerService,
          useValue: mock<LoggerService>(),
        },
        {
          provide: AppJobService,
          useValue: mock<AppJobService>(),
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

  it('forwards update notice acknowledgements to the lifecycle service', async () => {
    appLifecycleService.updateApp.mockResolvedValue({ requestId: 'request-id' } as never);

    const response = await request(app.getHttpServer())
      .patch('/app-lifecycle/app%3Astore/update')
      .set('Authorization', 'Bearer cli-token')
      .send({
        performBackup: true,
        acknowledgedNoticeIds: ['database-migration-22'],
        targetTipiVersion: 25,
        noticesFingerprint: 'fingerprint',
      });

    expect(response.status).toBe(200);
    expect(appLifecycleService.updateApp).toHaveBeenCalledWith({
      appUrn: 'app:store',
      performBackup: true,
      acknowledgedNoticeIds: ['database-migration-22'],
      targetTipiVersion: 25,
      noticesFingerprint: 'fingerprint',
    });
  });

  it('still updates without notice fields when none are provided', async () => {
    appLifecycleService.updateApp.mockResolvedValue({ requestId: 'request-id' } as never);

    const response = await request(app.getHttpServer())
      .patch('/app-lifecycle/app%3Astore/update')
      .set('Authorization', 'Bearer cli-token')
      .send({ performBackup: false });

    expect(response.status).toBe(200);
    expect(appLifecycleService.updateApp).toHaveBeenCalledWith({
      appUrn: 'app:store',
      performBackup: false,
      acknowledgedNoticeIds: undefined,
      targetTipiVersion: undefined,
      noticesFingerprint: undefined,
    });
  });
});
