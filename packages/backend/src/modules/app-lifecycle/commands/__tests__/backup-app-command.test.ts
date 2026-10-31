import { BackupManager, BackupRecoveryError } from '@/modules/backups/backup.manager';
import type { AppUrn } from '@runtipi/common/types';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackupAppCommand } from '../backup-app-command';

test.each([
  [new Error('backup failed'), true],
  [new BackupRecoveryError('restart failed'), false],
])('reports whether the backup recovered the app: %s', async (error, rollbackSucceeded) => {
  const appUrn = 'store:test' as AppUrn;
  const backupManager = mock<BackupManager>();
  const moduleRef = mock<ModuleRef>();
  moduleRef.get.mockReturnValue(backupManager);
  backupManager.backupApp.mockRejectedValue(error);
  const command = new BackupAppCommand(moduleRef, mock<Dockerode>(), true);

  await expect(command.execute(appUrn)).resolves.toEqual({ success: false, message: error.message, rollbackSucceeded });
  expect(backupManager.backupApp).toHaveBeenCalledWith(appUrn, true, undefined);
});
