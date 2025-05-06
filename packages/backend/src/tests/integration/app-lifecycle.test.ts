import fs from 'node:fs';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { DATABASE } from '@/core/database/database.module';
import { DatabaseService } from '@/core/database/database.service';
import { appStore } from '@/core/database/drizzle/schema';
import { app as appTable } from '@/core/database/drizzle/schema';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppLifecycleCommandFactory } from '@/modules/app-lifecycle/app-lifecycle-command.factory';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { AppStoreRepository } from '@/modules/app-stores/app-store.repository';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppsService } from '@/modules/apps/apps.service';
import { DOCKERODE } from '@/modules/docker/docker.module';
import { DockerService } from '@/modules/docker/docker.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { SubnetManagerService } from '@/modules/network/subnet-manager.service';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from '@/modules/queue/entities/app-events';
import { QueueFactory } from '@/modules/queue/queue.factory';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
  const configurationService = mock<ConfigurationService>();
  let databaseService = mock<DatabaseService>();
  const dockerService = mock<DockerService>();
  const loggerService = mock<LoggerService>();

  configurationService.get.calledWith('queue').mockReturnValue({
    host: 'localhost',
    password: 'guest',
    username: 'guest',
  });
  dockerService.composeApp.mockResolvedValue({ success: true, stdout: '', stderr: '' });

  const queueFactory = new QueueFactory(loggerService, configurationService);
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
        AppsService,
        SubnetManagerService,
        {
          provide: DockerService,
          useValue: dockerService,
        },
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
        {
          provide: DATABASE,
          useValue: db,
        },
        {
          provide: DOCKERODE,
          useValue: {
            pruneContainers: vi.fn().mockRejectedValue(null),
            pruneNetworks: vi.fn().mockRejectedValue(null),
            listNetworks: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AppEventsQueue,
          useValue: appEventsQueue,
        },
        {
          provide: ConfigurationService,
          useValue: configurationService,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    })
      .useMocker(mock)
      .compile();

    appLifecycleService = moduleRef.get(AppLifecycleService);
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

    await db.insert(appStore).values({ slug: 'test', url: 'https://appstore.example.com', hash: 'test', name: 'test', enabled: true }).execute();
    await marketplaceService.initialize();
  });

  describe('install app', () => {
    it('should successfully install app and create expected directory structure', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'test' });

      // act
      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // assert
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
    });

    it('should not delete an existing app-data folder even if the app is reinstalled', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'test2' });

      await fs.promises.mkdir(`${APP_DATA_DIR}/test/test2/data`, { recursive: true });
      await fs.promises.writeFile(`${APP_DATA_DIR}/test/test2/data/test.txt`, 'test');

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // assert
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
    });
  });

  describe('update app', () => {
    it('should successfully update an app to a newer version', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { tipi_version: 1 });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
        expect(app?.version).toBe(1);
      });

      await createAppInStore('test', { id: appInfo.id, tipi_version: 2 });

      await fs.promises.mkdir(`${APP_DATA_DIR}/test/${appInfo.id}/data`, { recursive: true });
      await fs.promises.writeFile(`${APP_DATA_DIR}/test/${appInfo.id}/data/preserved.txt`, 'data to preserve');

      // act
      await appLifecycleService.updateApp({ appUrn: appInfo.urn, performBackup: false });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
        expect(app?.version).toBe(2);
      });

      const dataFileExists = await fs.promises
        .access(`${APP_DATA_DIR}/test/${appInfo.id}/data/preserved.txt`)
        .then(() => true)
        .catch(() => false);
      expect(dataFileExists).toBe(true);
    });
  });

  describe('update all apps', () => {
    it('should update multiple apps that have newer versions available', async () => {
      // arrange
      const app1Info = await createAppInStore('test', { id: 'app1', tipi_version: 1 });
      const app2Info = await createAppInStore('test', { id: 'app2', tipi_version: 2 });
      const app3Info = await createAppInStore('test', { id: 'app3', tipi_version: 3 });

      await appLifecycleService.installApp({ appUrn: app1Info.urn, form: {} });
      await appLifecycleService.installApp({ appUrn: app2Info.urn, form: {} });
      await appLifecycleService.installApp({ appUrn: app3Info.urn, form: {} });

      await waitFor(async () => {
        const app1 = await appsRepository.getAppByUrn(app1Info.urn);
        const app2 = await appsRepository.getAppByUrn(app2Info.urn);
        const app3 = await appsRepository.getAppByUrn(app3Info.urn);
        expect(app1?.status).toBe('running');
        expect(app2?.status).toBe('running');
        expect(app3?.status).toBe('running');
      });

      await createAppInStore('test', { id: 'app1', tipi_version: 2 });
      await createAppInStore('test', { id: 'app3', tipi_version: 4 });

      // act
      await appLifecycleService.updateAllApps();

      await waitFor(async () => {
        const app1 = await appsRepository.getAppByUrn(app1Info.urn);
        expect(app1?.status).toBe('running');
        expect(app1?.version).toBe(2);
      });

      await waitFor(async () => {
        const app3 = await appsRepository.getAppByUrn(app3Info.urn);
        expect(app3?.status).toBe('running');
        expect(app3?.version).toBe(4);
      });

      // assert
      const app1 = await appsRepository.getAppByUrn(app1Info.urn);
      const app2 = await appsRepository.getAppByUrn(app2Info.urn);
      const app3 = await appsRepository.getAppByUrn(app3Info.urn);

      expect(app1?.version).toBe(2);
      expect(app2?.version).toBe(2);
      expect(app3?.version).toBe(4);

      expect(app1?.status).toBe('running');
      expect(app2?.status).toBe('running');
      expect(app3?.status).toBe('running');
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
    });
  });

  describe('app subnet assignment', () => {
    it('should assign a subnet to an app when started if it has none', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'subnet-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // Remove subnet value to simulate an app without a subnet
      await db.update(appTable).set({ subnet: null }).where(eq(appTable.appName, appInfo.id)).execute();

      let app = await appsRepository.getAppByUrn(appInfo.urn);
      expect(app?.subnet).toBeNull();

      // act
      await appLifecycleService.startApp({ appUrn: appInfo.urn });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      app = await appsRepository.getAppByUrn(appInfo.urn);
      expect(app?.subnet).not.toBeNull();
      expect(app?.subnet).toMatch(/^10\.128\.\d+\.0\/24$/);
    });
  });
});
