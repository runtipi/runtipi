import fs from 'node:fs';
import path from 'node:path';
import type { ArchiveService } from '@/core/archive/archive.service';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppsRepository } from '@/modules/apps/apps.repository';
import type { DockerService } from '@/modules/docker/docker.service';
import type { AppJobContext } from '@/modules/app-lifecycle/services/app-job.service';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { BackupAppCommand } from '@/modules/app-lifecycle/commands/backup-app-command';
import type { SSEService } from '@/core/sse/sse.service';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackupManager, BackupRecoveryError } from '../backup.manager';

const appUrn = 'demo:store' as AppUrn;
const snapshotRoot = '/tmp/runtipi-backup-staging';
const archiveRoot = '/data/backups/.staging';

afterEach(() => vi.restoreAllMocks());

const setup = async () => {
  const logger = mock<LoggerService>();
  const archive = mock<ArchiveService>();
  const config = mock<ConfigurationService>();
  const appFiles = mock<AppFilesManager>();
  const docker = mock<DockerService>();
  const apps = mock<AppsRepository>();
  const filesystem = new FilesystemService(logger);
  const backupDir = '/data/backups/store/demo';
  const appDataDir = '/app-data/store/demo';
  const appInstalledDir = '/data/apps/store/demo';

  config.get.calledWith('directories').mockReturnValue(fromPartial({ dataDir: '/data' }));
  appFiles.getAppPaths.mockReturnValue({ appDataDir, appInstalledDir });
  apps.getAppByUrn.mockResolvedValue(fromPartial({ maxBackups: 0 }));
  docker.composeApp.mockResolvedValue({ success: true, stdout: '', stderr: '' });
  archive.createTarGz.mockImplementation(async (_source, destination) => {
    await fs.promises.writeFile(destination, 'complete archive');
    return { stdout: '', stderr: '' };
  });

  await fs.promises.mkdir('/tmp', { recursive: true });
  await fs.promises.mkdir(backupDir, { recursive: true });
  await fs.promises.mkdir(appDataDir, { recursive: true });
  await fs.promises.mkdir(appInstalledDir, { recursive: true });
  await fs.promises.writeFile(path.join(backupDir, 'demo-store-old.tar.gz'), 'good older backup');
  await fs.promises.writeFile(path.join(appDataDir, 'data.txt'), 'consistent snapshot');
  await fs.promises.writeFile(path.join(appInstalledDir, 'config.json'), '{}');

  const manager = new BackupManager(archive, logger, config, filesystem, appFiles, docker, apps);

  return { manager, archive, backupDir, appDataDir, appInstalledDir, docker, apps, logger };
};

test.each(['tar terminated by SIGTERM', 'tar failed with exit code 2'])(
  'does not publish a broken backup and removes staging files: %s',
  async (message) => {
    const { manager, archive, backupDir, docker } = await setup();
    archive.createTarGz.mockImplementation(async (_source, destination) => {
      await fs.promises.writeFile(destination, 'truncated archive');
      throw new Error(message);
    });

    await expect(manager.backupApp(appUrn, true)).rejects.toThrow(message);

    expect(await fs.promises.readdir(backupDir)).toEqual(['demo-store-old.tar.gz']);
    expect(await fs.promises.readdir(snapshotRoot)).toEqual([]);
    expect(await fs.promises.readdir(archiveRoot)).toEqual([]);
    expect(docker.composeApp.mock.calls.map(([, command]) => command)).toEqual(['stop', 'up --detach --remove-orphans']);
  },
);

test('restarts the app before compressing its immutable snapshot', async () => {
  const { manager, archive, appDataDir, backupDir, docker } = await setup();
  docker.composeApp.mockImplementation(async (_urn, command) => {
    if (command === 'up --detach --remove-orphans') {
      await fs.promises.writeFile(path.join(appDataDir, 'data.txt'), 'new live data');
    }
    return { success: true, stdout: '', stderr: '' };
  });
  archive.createTarGz.mockImplementation(async (source, destination) => {
    expect(await fs.promises.readFile(path.join(source, 'app-data', 'data.txt'), 'utf8')).toBe('consistent snapshot');
    expect(await fs.promises.readFile(path.join(appDataDir, 'data.txt'), 'utf8')).toBe('new live data');
    expect(path.dirname(destination)).toBe(archiveRoot);
    await fs.promises.writeFile(destination, 'complete archive');

    return { stdout: '', stderr: '' };
  });

  await manager.backupApp(appUrn, true);

  expect(await manager.listBackupsByAppId(appUrn)).toHaveLength(2);
  expect(await fs.promises.readdir(snapshotRoot)).toEqual([]);
  expect(await fs.promises.readdir(archiveRoot)).toEqual([]);
  expect((await fs.promises.readdir(backupDir)).every((name) => name.endsWith('.tar.gz'))).toBe(true);
});

test('leaves a stopped app stopped after backing it up', async () => {
  const { manager, docker } = await setup();

  await manager.backupApp(appUrn, false);

  expect(docker.composeApp.mock.calls.map(([, command]) => command)).toEqual(['stop']);
});

test.each(['stop', 'copy'])('recovers the running app when snapshot preparation fails during %s', async (phase) => {
  const { manager, docker, appInstalledDir, archive } = await setup();
  if (phase === 'stop') {
    docker.composeApp.mockRejectedValueOnce(new Error('stop failed'));
  } else {
    await fs.promises.rm(appInstalledDir, { recursive: true });
  }

  await expect(manager.backupApp(appUrn, true)).rejects.toThrow();

  expect(docker.composeApp).toHaveBeenLastCalledWith(appUrn, 'up --detach --remove-orphans');
  expect(archive.createTarGz).not.toHaveBeenCalled();
});

test('reports failed recovery distinctly so cancellation cannot hide it', async () => {
  const { manager, docker, appInstalledDir } = await setup();
  await fs.promises.rm(appInstalledDir, { recursive: true });
  docker.composeApp.mockResolvedValueOnce({ success: true, stdout: '', stderr: '' }).mockRejectedValueOnce(new Error('restart failed'));

  await expect(manager.backupApp(appUrn, true)).rejects.toThrow(BackupRecoveryError);
});

test('cancellation cleans up the snapshot and restarts the app without publishing an archive', async () => {
  const { manager, archive, backupDir, docker } = await setup();
  const controller = new AbortController();
  const context: AppJobContext = {
    signal: controller.signal,
    disableCancellation: vi.fn(),
    progress: (phase) => {
      if (phase === 'copying') controller.abort(new Error('Job cancelled'));
    },
  };

  await expect(manager.backupApp(appUrn, true, context)).rejects.toThrow();

  expect(archive.createTarGz).not.toHaveBeenCalled();
  expect(docker.composeApp).toHaveBeenLastCalledWith(appUrn, 'up --detach --remove-orphans');
  expect(await fs.promises.readdir(backupDir)).toEqual(['demo-store-old.tar.gz']);
  expect(await fs.promises.readdir(snapshotRoot)).toEqual([]);
});

test('applies retention after publishing the completed backup', async () => {
  const { manager, apps, backupDir } = await setup();
  apps.getAppByUrn.mockResolvedValue(fromPartial({ maxBackups: 1 }));
  const oldBackup = path.join(backupDir, 'demo-store-old.tar.gz');
  await fs.promises.utimes(oldBackup, new Date(0), new Date(0));

  await manager.backupApp(appUrn, false);

  expect(await fs.promises.readdir(backupDir)).toHaveLength(1);
  await expect(fs.promises.lstat(oldBackup)).rejects.toMatchObject({ code: 'ENOENT' });
});

test.each(['publication', 'retention'])('rejects cancellation during %s and keeps the completed backup successful', async (boundary) => {
  const { manager, apps, backupDir, logger } = await setup();
  const jobs = new AppJobService(logger, mock<SSEService>());
  const moduleRef = mock<ModuleRef>();
  moduleRef.get.mockReturnValue(manager);

  let cancellationError: unknown;

  const cancel = () => {
    try {
      jobs.cancel(appUrn, request.requestId);
    } catch (error) {
      cancellationError = error;
    }
  };

  if (boundary === 'publication') {
    const rename = fs.promises.rename.bind(fs.promises);

    vi.spyOn(fs.promises, 'rename').mockImplementation(async (...args) => {
      cancel();
      await rename(...args);
    });
  } else {
    apps.getAppByUrn.mockImplementation(async () => {
      cancel();
      return fromPartial({ maxBackups: 0 });
    });
  }

  const request = jobs.submit(appUrn, 'backup', (context) => new BackupAppCommand(moduleRef, mock<Dockerode>(), false, context).execute(appUrn));

  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));

  expect(jobs.getJob(appUrn)).toMatchObject({ status: 'succeeded', message: `App ${appUrn} backed up successfully` });
  expect(cancellationError).toMatchObject({ status: 409 });
  expect(await fs.promises.readdir(backupDir)).toHaveLength(2);
  expect(await fs.promises.readdir(snapshotRoot)).toEqual([]);
  expect(await fs.promises.readdir(archiveRoot)).toEqual([]);
});

test('honors cancellation after compression and before archive publication', async () => {
  const { manager, archive, backupDir } = await setup();
  const controller = new AbortController();
  archive.createTarGz.mockImplementation(async (_source, destination) => {
    await fs.promises.writeFile(destination, 'complete archive');
    controller.abort(new Error('Job cancelled'));
    return { stdout: '', stderr: '' };
  });

  const context: AppJobContext = {
    signal: controller.signal,
    progress: () => {},
    disableCancellation: () => controller.signal.throwIfAborted(),
  };

  await expect(manager.backupApp(appUrn, false, context)).rejects.toThrow('Job cancelled');

  expect(await fs.promises.readdir(backupDir)).toEqual(['demo-store-old.tar.gz']);
  expect(await fs.promises.readdir(snapshotRoot)).toEqual([]);
  expect(await fs.promises.readdir(archiveRoot)).toEqual([]);
});

test('keeps a completed backup successful when retention housekeeping fails', async () => {
  const { manager, apps, logger } = await setup();
  apps.getAppByUrn.mockRejectedValue(new Error('database unavailable'));

  await expect(manager.backupApp(appUrn, false)).resolves.toBeUndefined();

  expect(await manager.listBackupsByAppId(appUrn)).toHaveLength(2);
  expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('clean old backups'), expect.any(Error));
});

test('startup cleans only the owned staging locations and preserves recovery snapshots and backups', async () => {
  const { manager, backupDir } = await setup();
  const recoveryDir = '/tmp/runtipi-update-Ab12Cd';

  for (const directory of [snapshotRoot, archiveRoot, recoveryDir]) {
    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(path.join(directory, 'snapshot'), 'data');
  }

  await manager.onModuleInit();

  await expect(fs.promises.lstat(snapshotRoot)).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(fs.promises.lstat(archiveRoot)).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await fs.promises.readFile(path.join(recoveryDir, 'snapshot'), 'utf8')).toBe('data');
  expect(await fs.promises.readFile(path.join(backupDir, 'demo-store-old.tar.gz'), 'utf8')).toBe('good older backup');
});

test('startup removes a staging symlink without following its target', async () => {
  const { manager } = await setup();
  await fs.promises.mkdir('/outside');
  await fs.promises.writeFile('/outside/keep', 'preserve');
  await fs.promises.symlink('/outside', snapshotRoot);
  await fs.promises.symlink('/outside', archiveRoot);

  await manager.onModuleInit();

  expect(await fs.promises.readFile('/outside/keep', 'utf8')).toBe('preserve');
});

test('startup ignores a symlink replacing the backups root', async () => {
  const { manager } = await setup();
  await fs.promises.mkdir('/outside/.staging', { recursive: true });
  await fs.promises.writeFile('/outside/.staging/keep', 'preserve');
  await fs.promises.rm('/data/backups', { recursive: true });
  await fs.promises.symlink('/outside', '/data/backups');

  await manager.onModuleInit();

  expect(await fs.promises.readFile('/outside/.staging/keep', 'utf8')).toBe('preserve');
});

test('cleanup failure is logged without preventing startup', async () => {
  const { manager, logger } = await setup();
  await fs.promises.mkdir(snapshotRoot, { recursive: true });
  vi.spyOn(fs.promises, 'rm').mockRejectedValue(new Error('read-only filesystem'));

  await expect(manager.onModuleInit()).resolves.toBeUndefined();

  expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('backup staging'), expect.any(Error));
});
