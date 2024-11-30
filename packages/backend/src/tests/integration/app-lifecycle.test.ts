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
import { AppHelpers } from '@/modules/apps/app.helpers';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { DockerComposeBuilder } from '@/modules/docker/builders/compose.builder';
import { EnvUtils } from '@/modules/env/env.utils';
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
import { type TestDatabase, cleanTestData, createTestDatabase } from '../utils/create-test-database';

let db: TestDatabase;
const DB_NAME = 'applifecycletest';

describe('App lifecycle', () => {
  let appLifecycleService: AppLifecycleService;
  let marketplaceService: MarketplaceService;
  let appsRepository: AppsRepository;
  let configurationService = mock<ConfigurationService>();
  let databaseService = mock<DatabaseService>();
  const queueFactory = new QueueFactory();
  const appEventsQueue = queueFactory.createQueue({
    queueName: 'app-events-queue',
    workers: 1,
    eventSchema: appEventSchema,
    resultSchema: appEventResultSchema,
  });

  beforeAll(async () => {
    db = await createTestDatabase(DB_NAME);
  });

  beforeEach(async () => {
    await cleanTestData(db);

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
        AppsRepository,
        EnvUtils,
        AppHelpers,
        DockerComposeBuilder,
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
        {
          provide: AppEventsQueue,
          useValue: appEventsQueue,
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
      fromPartial({
        demoMode: false,
        directories: { dataDir: DATA_DIR, appDir: APP_DIR, appDataDir: APP_DATA_DIR },
        internalIp: '127.0.0.1',
        envFilePath: '/data/.env',
        rootFolderHost: '/opt/runtipi',
        userSettings: {
          appDataPath: '/opt/runtipi',
        },
      }),
    );

    await db.insert(appStore).values({ id: 1, url: 'https://appstore.example.com', hash: 'test', name: 'test', enabled: true }).execute();
    await marketplaceService.initialize();
  });

  describe('install app', () => {
    it('should copy the correct files and folders from app store', async () => {
      // arrange
      const appInfo = await createAppInStore(1, { id: 'test' });
      const appId = `1_${appInfo.id}`;

      // act
      await appLifecycleService.installApp({ appId, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getApp(appId);
        expect(app?.status).toBe('running');
      });

      // assert
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
      const yml = await fs.promises.readFile(`${DATA_DIR}/apps/1/${appInfo.id}/docker-compose.yml`, 'utf-8');
      expect(yml).toMatchSnapshot();
    });

    it('should not delete an existing app-data folder even if the app is reinstalled', async () => {
      // arrange
      const appInfo = await createAppInStore(1, { id: 'test2' });
      const appId = `1_${appInfo.id}`;

      await fs.promises.mkdir(`${APP_DATA_DIR}/1_test2/data`, { recursive: true });
      await fs.promises.writeFile(`${APP_DATA_DIR}/1_test2/data/test.txt`, 'test');

      await appLifecycleService.installApp({ appId, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getApp(appId);
        expect(app?.status).toBe('running');
      });

      // assert
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
    });
  });
});
