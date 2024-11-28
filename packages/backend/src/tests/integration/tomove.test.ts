import fs from 'node:fs';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { DatabaseService } from '@/core/database/database.service';
import { appStore } from '@/core/database/drizzle/schema';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { AppLifecycleCommandFactory } from '@/modules/app-lifecycle/app-lifecycle-command.factory';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { AppStoreRepository } from '@/modules/app-stores/app-store.repository';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from '@/modules/queue/entities/app-events';
import { QueueFactory } from '@/modules/queue/queue.factory';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import waitFor from 'wait-for-expect';
import type { FsMock } from '../__mocks__/fs';
import { createAppInStore } from '../utils/create-app-in-store';
import { createTestDatabase } from '../utils/create-test-database';

let db: Awaited<ReturnType<typeof createTestDatabase>>;

describe('App lifecycle', () => {
  let appLifecycleService: AppLifecycleService;
  let marketplaceService: MarketplaceService;
  let appsRepository: AppsRepository;
  let configurationService = mock<ConfigurationService>();
  let databaseService = mock<DatabaseService>();

  beforeAll(async () => {
    db = await createTestDatabase('integrationtest');
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppLifecycleService,
        MarketplaceService,
        AppStoreService,
        AppStoreRepository,
        FilesystemService,
        QueueFactory,
        AppLifecycleCommandFactory,
        AppFilesManager,
        {
          provide: AppEventsQueue,
          useFactory: (queueFactory: QueueFactory) =>
            queueFactory.createQueue({
              queueName: 'app-events-queue',
              workers: 1,
              eventSchema: appEventSchema,
              resultSchema: appEventResultSchema,
            }),
          inject: [QueueFactory],
        },
      ],
    })
      .useMocker(mock)
      .compile();

    appLifecycleService = moduleRef.get(AppLifecycleService);
    configurationService = moduleRef.get(ConfigurationService);
    databaseService = moduleRef.get(DatabaseService);
    marketplaceService = moduleRef.get(MarketplaceService);
    appsRepository = moduleRef.get(AppsRepository);

    databaseService.db = db;
    configurationService.getConfig.mockReturnValue(
      fromPartial({ demoMode: false, directories: { dataDir: DATA_DIR, appDir: APP_DIR, appDataDir: APP_DATA_DIR } }),
    );

    db.insert(appStore).values({ id: 1, url: 'https://appstore.example.com', hash: 'test', name: 'test', enabled: true }).execute();

    await marketplaceService.initialize();
  });

  describe('install app', () => {
    it('should copy the correct files and folders from app store', async () => {
      // arrange
      const appInfo = await createAppInStore(1, { id: 'test' });
      const appId = `1_${appInfo.id}`;

      // act
      await appLifecycleService.installApp({ appId, form: {} });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      waitFor(async () => {
        const app = await appsRepository.getApp(appId);
        expect(app).toBeDefined();
      });

      // assert
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
    });
  });
});
