import { LoggerService } from '@/core/logger/logger.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { RestoreAppCommand } from '../restore-app-command';

const appUrn = 'store:test' as AppUrn;

const setup = () => {
  const logger = mock<LoggerService>();
  const dockerService = mock<DockerService>();
  const backupManager = mock<BackupManager>();
  const docker = mock<Dockerode>();
  const services = new Map<unknown, unknown>([
    [LoggerService, logger],
    [DockerService, dockerService],
    [BackupManager, backupManager],
  ]);
  const moduleRef = { get: (token: unknown) => services.get(token) } as ModuleRef;
  const command = new RestoreAppCommand(moduleRef, docker, 'backup.tar.gz');

  return { command, logger, dockerService, backupManager, docker };
};

test.each(['running', 'paused', 'restarting'])('does not restore an active app when compose stop fails: %s', async (state) => {
  const { command, dockerService, backupManager, docker } = setup();
  dockerService.composeApp.mockRejectedValue(new Error('stop failed'));
  docker.listContainers.mockResolvedValue([fromPartial({ Id: 'active-app', State: state })]);

  await expect(command.execute(appUrn)).resolves.toEqual({ success: false, message: 'stop failed', appStopped: false });
  expect(docker.listContainers).toHaveBeenCalledWith({ filters: { label: [`runtipi.appurn=${appUrn}`] } });
  expect(backupManager.restoreApp).not.toHaveBeenCalled();
});

test('restores a stopped app when broken compose or environment files prevent compose stop', async () => {
  const { command, logger, dockerService, backupManager, docker } = setup();
  const stopError = new Error('app.env does not exist');
  dockerService.composeApp.mockRejectedValue(stopError);
  docker.listContainers.mockResolvedValue([]);

  await expect(command.execute(appUrn)).resolves.toEqual({ success: true, message: `App ${appUrn} restored successfully`, appStopped: true });
  expect(docker.listContainers).toHaveBeenCalledWith({ filters: { label: [`runtipi.appurn=${appUrn}`] } });
  expect(backupManager.restoreApp).toHaveBeenCalledWith(appUrn, 'backup.tar.gz');
  expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('continuing restore'), stopError);
});

test('does not restore when Docker cannot confirm whether the app is stopped', async () => {
  const { command, dockerService, backupManager, docker } = setup();
  dockerService.composeApp.mockRejectedValue(new Error('stop failed'));
  docker.listContainers.mockRejectedValue(new Error('Docker unavailable'));

  await expect(command.execute(appUrn)).resolves.toEqual({ success: false, message: 'Docker unavailable', appStopped: false });
  expect(backupManager.restoreApp).not.toHaveBeenCalled();
});

test('delegates the complete restore transaction to the backup manager', async () => {
  const { command, backupManager, docker } = setup();
  const migrationState = { version: 1 as const, initialized: true, migrationIds: ['database-v2'] };
  backupManager.restoreApp.mockResolvedValue(migrationState);

  await expect(command.execute(appUrn)).resolves.toEqual({ success: true, message: `App ${appUrn} restored successfully`, appStopped: true });
  expect(backupManager.restoreApp).toHaveBeenCalledWith(appUrn, 'backup.tar.gz');
  expect(docker.listContainers).not.toHaveBeenCalled();
});

test.each([false, true])('reports that the app is stopped when restore fails after confirming shutdown (compose failed: %s)', async (stopFails) => {
  const { command, dockerService, backupManager, docker } = setup();
  if (stopFails) dockerService.composeApp.mockRejectedValue(new Error('stop failed'));
  docker.listContainers.mockResolvedValue([]);
  backupManager.restoreApp.mockRejectedValue(new Error('restore failed'));

  await expect(command.execute(appUrn)).resolves.toEqual({ success: false, message: 'restore failed', appStopped: true });
});
