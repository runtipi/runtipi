import { AppOperationsService } from '../services/app-operations.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppsService } from '@/modules/apps/apps.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { AppEventsQueue } from '@/modules/queue/entities/app-events';
import { AsyncMutex } from '@/utils/mutex/async-mutex';
import type { AppUrn } from '@runtipi/common/types';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppLifecycleCommandFactory } from '../app-lifecycle-command.factory';
import { AppLifecycleService } from '../app-lifecycle.service';
import { UpdateAppHandler } from '../handlers/update-app.handler';
import { AppMigrationService } from '../services/app-migration.service';

const createService = () => {
  const operations = Object.assign(mock<AppOperationsService>(), {
    admit: async <T>(_urn: AppUrn, task: () => Promise<T>) => task(),
  });
  const appsService = mock<AppsService>();
  const updateAppHandler = mock<UpdateAppHandler>();

  const service = new AppLifecycleService(
    mock<LoggerService>(),
    mock<AppEventsQueue>(),
    mock<AppLifecycleCommandFactory>(),
    mock<AppsRepository>(),
    appsService,
    new AsyncMutex(),
    mock<BackupManager>(),
    mock<AppMigrationService>(),
    // startApp, stopApp, restart, install, uninstall, reset, updateConfig
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    // updateAppHandler (validated target), then backup and restore handlers
    updateAppHandler,
    mock(),
    mock(),
    operations,
  );

  return { service, appsService, updateAppHandler };
};

test('backup deletion waits for the app lock and reconciles recovery before deleting', async () => {
  const appUrn = 'store:test' as AppUrn;
  const mutex = new AsyncMutex();
  const backupManager = mock<BackupManager>();
  const migrations = mock<AppMigrationService>();
  const release = await mutex.acquire(appUrn);
  const service = new AppLifecycleService(
    mock<LoggerService>(),
    mock<AppEventsQueue>(),
    mock<AppLifecycleCommandFactory>(),
    mock<AppsRepository>(),
    mock<AppsService>(),
    mutex,
    backupManager,
    migrations,
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    mock(),
    Object.assign(mock<AppOperationsService>(), { admit: async (_urn: AppUrn, task: () => Promise<void>) => task() }),
  );
  let recovered = false;
  migrations.reconcile.mockImplementation(async () => {
    recovered = true;
  });
  backupManager.deleteBackup.mockImplementation(async () => {
    expect(recovered).toBe(true);
  });

  const deletion = service.deleteAppBackup({ appUrn, filename: 'migration-rollback.tar.gz' });
  await Promise.resolve();
  expect(migrations.reconcile).not.toHaveBeenCalled();
  expect(backupManager.deleteBackup).not.toHaveBeenCalled();

  release();
  await deletion;

  expect(backupManager.deleteBackup).toHaveBeenCalledWith(appUrn, 'migration-rollback.tar.gz');
});

test('updateApp forwards update notice acknowledgements to the handler', async () => {
  const { service, updateAppHandler } = createService();
  updateAppHandler.execute.mockResolvedValue({ requestId: 'request-id' } as never);
  const appUrn = 'app:store' as AppUrn;

  await service.updateApp({
    appUrn,
    performBackup: true,
    acknowledgedNoticeIds: ['database-migration-2'],
    targetTipiVersion: 25,
    noticesFingerprint: 'fingerprint',
  });

  expect(updateAppHandler.execute).toHaveBeenCalledWith(appUrn, {
    performBackup: true,
    acknowledgedNoticeIds: ['database-migration-2'],
    targetTipiVersion: 25,
    noticesFingerprint: 'fingerprint',
  });
});

test('updateAllApps skips apps whose notices require confirmation and reports them', async () => {
  const { service, appsService, updateAppHandler } = createService();

  const storedApp = (id: number, version: number) => ({
    id,
    urn: undefined,
    status: 'running',
    version,
    ignoredVersion: null,
    appName: `app-${id}`,
    appStoreSlug: 'store',
  });

  appsService.getInstalledApps.mockResolvedValue([
    {
      app: storedApp(1, 1),
      info: { urn: 'app-1:store' },
      metadata: {
        latestVersion: 2,
        updateNotices: [
          {
            id: 'migration',
            tipi_version: 2,
            severity: 'warning',
            title: 'Migration',
            message: 'Migration',
            before_update: [],
            after_update: [],
            require_confirmation: true,
          },
        ],
      },
    },
    {
      app: storedApp(2, 1),
      info: { urn: 'app-2:store' },
      metadata: { latestVersion: 2, updateNotices: [] },
    },
  ] as unknown as Awaited<ReturnType<AppsService['getInstalledApps']>>);

  updateAppHandler.execute.mockResolvedValue({ requestId: 'request-id' });

  const result = await service.updateAllApps();

  // The app with a confirmation-required notice is never updated in bulk
  expect(updateAppHandler.execute).toHaveBeenCalledTimes(1);
  expect(result).toEqual([
    { urn: 'app-1:store', status: 'skipped', message: 'UPDATE_NOTICES_REQUIRE_CONFIRMATION' },
    { urn: 'app-2:store', status: 'accepted', requestId: 'request-id' },
  ]);
});

test('updateAllApps updates apps whose notices do not require confirmation', async () => {
  const { service, appsService, updateAppHandler } = createService();

  appsService.getInstalledApps.mockResolvedValue([
    {
      app: { id: 1, status: 'running', version: 1, ignoredVersion: null, appName: 'app-1', appStoreSlug: 'store' },
      info: { urn: 'app-1:store' },
      metadata: {
        latestVersion: 2,
        updateNotices: [
          {
            id: 'info',
            tipi_version: 2,
            severity: 'info',
            title: 'Info',
            message: 'Info',
            before_update: [],
            after_update: [],
            require_confirmation: false,
          },
        ],
      },
    },
  ] as unknown as Awaited<ReturnType<AppsService['getInstalledApps']>>);

  updateAppHandler.execute.mockResolvedValue({ requestId: 'request-id' });

  const result = await service.updateAllApps();

  expect(updateAppHandler.execute).toHaveBeenCalledTimes(1);
  expect(result).toEqual([{ urn: 'app-1:store', status: 'accepted', requestId: 'request-id' }]);
});
