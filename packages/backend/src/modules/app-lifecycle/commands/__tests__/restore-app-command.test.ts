import { LoggerService } from '@/core/logger/logger.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { RestoreAppCommand } from '../restore-app-command';

test('does not restore a live app when compose stop fails', async () => {
  const appUrn = 'store:test' as AppUrn;
  const logger = mock<LoggerService>();
  const dockerService = mock<DockerService>();
  const backupManager = mock<BackupManager>();
  const docker = mock<Dockerode>();
  dockerService.composeApp.mockRejectedValue(new Error('stop failed'));
  const services = new Map<unknown, unknown>([
    [LoggerService, logger],
    [DockerService, dockerService],
    [BackupManager, backupManager],
  ]);
  const moduleRef = { get: (token: unknown) => services.get(token) } as ModuleRef;
  const command = new RestoreAppCommand(moduleRef, docker, 'backup.tar.gz');

  await expect(command.execute(appUrn)).resolves.toEqual({ success: false, message: 'stop failed', appStopped: false });
  expect(backupManager.restoreApp).not.toHaveBeenCalled();
});

test('delegates the complete restore transaction to the backup manager', async () => {
  const appUrn = 'store:test' as AppUrn;
  const logger = mock<LoggerService>();
  const dockerService = mock<DockerService>();
  const backupManager = mock<BackupManager>();
  const docker = mock<Dockerode>();
  const migrationState = { version: 1 as const, initialized: true, migrationIds: ['database-v2'] };
  backupManager.restoreApp.mockResolvedValue(migrationState);
  const services = new Map<unknown, unknown>([
    [LoggerService, logger],
    [DockerService, dockerService],
    [BackupManager, backupManager],
  ]);
  const moduleRef = { get: (token: unknown) => services.get(token) } as ModuleRef;
  const command = new RestoreAppCommand(moduleRef, docker, 'backup.tar.gz');

  await expect(command.execute(appUrn)).resolves.toEqual({ success: true, message: `App ${appUrn} restored successfully`, appStopped: true });
  expect(backupManager.restoreApp).toHaveBeenCalledWith(appUrn, 'backup.tar.gz');
});

test('reports that the app is stopped when restore fails after compose stop', async () => {
  const appUrn = 'store:test' as AppUrn;
  const logger = mock<LoggerService>();
  const dockerService = mock<DockerService>();
  const backupManager = mock<BackupManager>();
  const docker = mock<Dockerode>();
  backupManager.restoreApp.mockRejectedValue(new Error('restore failed'));
  const services = new Map<unknown, unknown>([
    [LoggerService, logger],
    [DockerService, dockerService],
    [BackupManager, backupManager],
  ]);
  const moduleRef = { get: (token: unknown) => services.get(token) } as ModuleRef;
  const command = new RestoreAppCommand(moduleRef, docker, 'backup.tar.gz');

  await expect(command.execute(appUrn)).resolves.toEqual({ success: false, message: 'restore failed', appStopped: true });
});
