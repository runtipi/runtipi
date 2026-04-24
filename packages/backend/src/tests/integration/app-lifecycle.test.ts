import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import { ArchiveService } from '@/core/archive/archive.service';
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
import { BackupManager } from '@/modules/backups/backup.manager';
import { DOCKERODE } from '@/modules/docker/docker.module';
import { DockerService } from '@/modules/docker/docker.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { SubnetManagerService } from '@/modules/network/subnet-manager.service';
import { AppEventsQueue, appEventSchema } from '@/modules/queue/entities/app-events';
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
import { APP_ASYNC_MUTEX } from '@/utils/mutex/mutex.module';
import { AsyncMutex } from '@/utils/mutex/async-mutex';
import { UpdateAppHandler } from '@/modules/app-lifecycle/handlers/update-app.handler';
import { UpdateConfigHandler } from '@/modules/app-lifecycle/handlers/update-config.handler';
import { ResetAppHandler } from '@/modules/app-lifecycle/handlers/reset-app.handler';
import { UninstallAppHandler } from '@/modules/app-lifecycle/handlers/uninstall-app.handler';
import { InstallAppHandler } from '@/modules/app-lifecycle/handlers/install-app.handler';
import { RestartAppHandler } from '@/modules/app-lifecycle/handlers/restart-app.handler';
import { StopAppHandler } from '@/modules/app-lifecycle/handlers/stop-app.handler';
import { StartAppHandler } from '@/modules/app-lifecycle/handlers/start-app.handler';
import { AppStatusSyncService } from '@/modules/app-lifecycle/app-status-sync.service';
import { StatusManagerService } from '@/modules/app-lifecycle/services/status-manager.service';
import { AppValidationService } from '@/modules/app-lifecycle/services/app-validation.service';

let db: TestDatabase;
const DB_NAME = 'applifecycletest';

describe('App lifecycle', () => {
  let appLifecycleService: AppLifecycleService;
  let marketplaceService: MarketplaceService;
  let appsRepository: AppsRepository;
  let filesystemService: FilesystemService;
  const configurationService = mock<ConfigurationService>();
  let databaseService = mock<DatabaseService>();
  const dockerService = mock<DockerService>();
  const loggerService = mock<LoggerService>();
  const archiveService = mock<ArchiveService>();

  configurationService.get.calledWith('queue').mockReturnValue({
    host: 'localhost',
    password: 'guest',
    username: 'guest',
  });
  configurationService.get.calledWith('directories').mockReturnValue({
    dataDir: DATA_DIR,
    appDir: APP_DIR,
    appDataDir: APP_DATA_DIR,
  });
  configurationService.get.calledWith('userSettings').mockReturnValue(fromPartial({ eventsTimeout: 1, maxBackups: 1 }));
  configurationService.get.calledWith('demoMode').mockReturnValue(false);
  dockerService.composeApp.mockResolvedValue({ success: true, stdout: '', stderr: '' });

  const queueFactory = new QueueFactory(loggerService, configurationService);
  const appEventsQueue = queueFactory.createQueue({
    queueName: 'app-events-queue',
    workers: 1,
    eventSchema: appEventSchema,
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
        BackupManager,
        QueueFactory,
        AppLifecycleCommandFactory,
        AppFilesManager,
        AppsRepository,
        EnvUtils,
        AppHelpers,
        AppsService,
        SubnetManagerService,
        StartAppHandler,
        StopAppHandler,
        RestartAppHandler,
        InstallAppHandler,
        UninstallAppHandler,
        ResetAppHandler,
        UpdateConfigHandler,
        UpdateAppHandler,
        AppStatusSyncService,
        StatusManagerService,
        AppValidationService,
        {
          provide: APP_ASYNC_MUTEX,
          useValue: new AsyncMutex(),
        },
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
        {
          provide: ArchiveService,
          useValue: archiveService,
        },
      ],
    })
      .useMocker(mock)
      .compile();

    appLifecycleService = moduleRef.get(AppLifecycleService);
    databaseService = moduleRef.get(DatabaseService);
    marketplaceService = moduleRef.get(MarketplaceService);
    appsRepository = moduleRef.get(AppsRepository);
    filesystemService = moduleRef.get(FilesystemService);

    databaseService.db = db;

    archiveService.createTarGz.mockImplementation(async (_sourceDir, destinationFile) => {
      await fs.promises.mkdir(path.dirname(destinationFile), { recursive: true });
      await fs.promises.writeFile(destinationFile, 'archive');
      return { stdout: '', stderr: '' };
    });
    archiveService.extractTarGz.mockResolvedValue({ stdout: '', stderr: '' });
    vi.spyOn(filesystemService, 'createTempDirectory').mockImplementation(async (prefix) => {
      const tempDir = path.join('/tmp', `${prefix}-${Date.now()}`);
      await fs.promises.mkdir(tempDir, { recursive: true });
      return tempDir;
    });

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

    it('should keep only the configured number of backups when updating with backups enabled', async () => {
      const appInfo = await createAppInStore('test', { id: 'backup-retention-test', tipi_version: 1 });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
        expect(app?.version).toBe(1);
      });

      await createAppInStore('test', { id: appInfo.id, tipi_version: 2 });
      await appLifecycleService.updateApp({ appUrn: appInfo.urn, performBackup: true });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
        expect(app?.version).toBe(2);
      });

      await createAppInStore('test', { id: appInfo.id, tipi_version: 3 });
      await appLifecycleService.updateApp({ appUrn: appInfo.urn, performBackup: true });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
        expect(app?.version).toBe(3);
      });

      await waitFor(async () => {
        const backups = await fs.promises.readdir(`${DATA_DIR}/backups/test/${appInfo.id}`);
        expect(backups).toHaveLength(1);
      });
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

      const tree = (fs as unknown as FsMock).tree().replace(/-\d+\.tar\.gz/g, '-TIMESTAMP.tar.gz');

      expect(tree).toMatchSnapshot();
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

  describe('architecture-specific overrides', () => {
    it('should apply architecture-specific overrides when generating docker-compose file', async () => {
      // arrange
      configurationService.get.calledWith('architecture').mockReturnValue('arm64');
      const appInfo = await createAppInStore('test', { id: 'arch-test' });
      const composeJson = {
        services: [
          {
            name: 'app',
            image: 'app:latest',
            isMain: true,
            internalPort: 80,
          },
        ],
        overrides: [
          {
            architecture: 'arm64',
            services: [
              {
                name: 'app',
                image: 'app:arm64-latest',
              },
            ],
          },
        ],
      };

      await fs.promises.mkdir(`${DATA_DIR}/repos/test/apps/arch-test`, { recursive: true });
      await fs.promises.writeFile(`${DATA_DIR}/repos/test/apps/arch-test/docker-compose.json`, JSON.stringify(composeJson));

      // act
      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // assert
      const composeFileContent = await fs.promises.readFile(`${DATA_DIR}/apps/test/arch-test/docker-compose.generated.yml`, 'utf8');
      expect(composeFileContent).toContain('app:arm64-latest');
      expect(composeFileContent).not.toContain('app:latest');
    });
  });

  describe('stop app', () => {
    it('should successfully stop a running app', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'stop-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // act
      await appLifecycleService.stopApp({ appUrn: appInfo.urn });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('stopped');
      });
    });
  });

  describe('start app', () => {
    it('should successfully start a stopped app', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'start-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      await appLifecycleService.stopApp({ appUrn: appInfo.urn });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('stopped');
      });

      // act
      await appLifecycleService.startApp({ appUrn: appInfo.urn });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });
    });
  });

  describe('restart app', () => {
    it('should successfully restart a running app', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'restart-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // act
      await appLifecycleService.restartApp({ appUrn: appInfo.urn });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });
    });
  });

  describe('uninstall app', () => {
    it('should successfully uninstall an installed app', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'uninstall-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // act
      await appLifecycleService.uninstallApp({ appUrn: appInfo.urn, removeBackups: false });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app).toBeUndefined();
      });
    });

    it('should successfully uninstall an app and remove its backups when removeBackups is true', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'uninstall-backup-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // act
      await appLifecycleService.uninstallApp({ appUrn: appInfo.urn, removeBackups: true });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app).toBeUndefined();
      });
    });
  });

  describe('reset app', () => {
    it('should successfully reset an app and restart it if it was running', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'reset-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      await fs.promises.mkdir(`${APP_DATA_DIR}/test/reset-test/data`, { recursive: true });
      await fs.promises.writeFile(`${APP_DATA_DIR}/test/reset-test/data/test.txt`, 'test data');

      // act
      await appLifecycleService.resetApp({ appUrn: appInfo.urn });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      const dataFileExists = await fs.promises
        .access(`${APP_DATA_DIR}/test/reset-test/data/test.txt`)
        .then(() => true)
        .catch(() => false);
      expect(dataFileExists).toBe(false);
    });

    it('should successfully reset an app and keep it stopped if it was stopped', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'reset-stopped-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      await appLifecycleService.stopApp({ appUrn: appInfo.urn });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('stopped');
      });

      await fs.promises.mkdir(`${APP_DATA_DIR}/test/reset-stopped-test/data`, { recursive: true });
      await fs.promises.writeFile(`${APP_DATA_DIR}/test/reset-stopped-test/data/test.txt`, 'test data');

      // act
      await appLifecycleService.resetApp({ appUrn: appInfo.urn });

      // assert
      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('stopped');
      });

      const dataFileExists = await fs.promises
        .access(`${APP_DATA_DIR}/test/reset-stopped-test/data/test.txt`)
        .then(() => true)
        .catch(() => false);
      expect(dataFileExists).toBe(false);
    });
  });

  describe('update app config', () => {
    it('should successfully update app configuration', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'config-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: {} });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // act
      await appLifecycleService.updateAppSettings({ appUrn: appInfo.urn, form: { TEST_FIELD: 'new-value' } });

      // assert
      const app = await appsRepository.getAppByUrn(appInfo.urn);
      expect(app?.config).toHaveProperty('TEST_FIELD', 'new-value');
    });

    it('should mark app as pending restart when config changes', async () => {
      // arrange
      const appInfo = await createAppInStore('test', { id: 'config-restart-test' });

      await appLifecycleService.installApp({ appUrn: appInfo.urn, form: { TEST_FIELD: 'old-value' } });

      await waitFor(async () => {
        const app = await appsRepository.getAppByUrn(appInfo.urn);
        expect(app?.status).toBe('running');
      });

      // act
      await appLifecycleService.updateAppSettings({ appUrn: appInfo.urn, form: { TEST_FIELD: 'new-value' } });

      // assert
      const app = await appsRepository.getAppByUrn(appInfo.urn);
      expect(app?.pendingRestart).toBe(true);
    });
  });
});
