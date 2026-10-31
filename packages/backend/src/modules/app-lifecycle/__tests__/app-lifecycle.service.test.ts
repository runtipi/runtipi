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
import { AppMigrationService } from '../services/app-migration.service';
import { AppJobService } from '../services/app-job.service';

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
    mock<AppJobService>(),
    mock<AppOperationsService>(),
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
