import fs from 'node:fs';
import path from 'node:path';
import { ArchiveService } from '@/core/archive/archive.service';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppsRepository } from '@/modules/apps/apps.repository';
import type { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, onTestFinished, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackupManager } from '../backup.manager';

vi.unmock('fs');
vi.unmock('node:fs');

vi.mock('@/common/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/common/constants')>()),
  DATA_DIR: (await import('node:fs')).realpathSync('/tmp'),
}));

test('backs up and restores container symlinks without reading or changing their targets', async () => {
  const root = await fs.promises.realpath(await fs.promises.mkdtemp('/tmp/runtipi-symlink-roundtrip-'));
  onTestFinished(() => fs.promises.rm(root, { recursive: true, force: true }));

  const appUrn = 'crowdsec:test-store' as AppUrn;
  const dataDir = path.join(root, 'runtipi');
  const appDataDir = path.join(root, 'app-data');
  const appInstalledDir = path.join(root, 'app');
  const userConfigDir = path.join(dataDir, 'user-config', 'test-store', 'crowdsec');
  const externalFile = path.join(root, 'outside.txt');
  const migrationState = { initialized: true, migrationIds: ['setup-v1'] };

  const logger = mock<LoggerService>();
  const filesystem = new FilesystemService(logger);
  const archive = new ArchiveService(logger);
  const repository = mock<AppsRepository>();
  repository.getMigrationState.mockResolvedValue(migrationState);
  repository.getRestoreJournal.mockResolvedValue(undefined);
  repository.createRestoreJournal.mockResolvedValue(undefined);
  repository.finishRestore.mockResolvedValue(undefined);
  repository.clearRestoreJournal.mockResolvedValue(undefined);

  const config = fromPartial<ConfigurationService>({ get: () => ({ dataDir }) });
  const appFiles = fromPartial<AppFilesManager>({ getAppPaths: () => ({ appDataDir, appInstalledDir }) });
  const docker = mock<DockerService>();
  docker.composeApp.mockImplementation(async (_urn, command) => {
    if (command === 'up --detach --remove-orphans') {
      const link = path.join(appDataDir, 'container.yaml');
      await fs.promises.unlink(link);
      await fs.promises.symlink('/changed/after-snapshot.yaml', link);
    }
    return { success: true, stdout: '', stderr: '' };
  });

  const manager = new BackupManager(archive, logger, config, filesystem, appFiles, repository, docker);

  await fs.promises.mkdir(path.join(appDataDir, 'data'), { recursive: true });
  await fs.promises.mkdir(appInstalledDir, { recursive: true });
  await fs.promises.mkdir(userConfigDir, { recursive: true });
  await fs.promises.writeFile(path.join(appDataDir, 'data', 'state.txt'), 'saved state');
  await fs.promises.writeFile(path.join(appInstalledDir, 'config.json'), '{}');
  await fs.promises.writeFile(externalFile, 'host data');

  const links = [
    { root: appDataDir, name: 'container.yaml', target: '/etc/crowdsec/detect.yaml' },
    { root: appDataDir, name: 'staging.yaml', target: '/staging/var/lib/crowdsec/data/detect.yaml' },
    { root: appDataDir, name: 'dangling.yaml', target: 'missing.yaml' },
    { root: appDataDir, name: 'linked-data', target: 'data' },
    { root: appDataDir, name: 'host-file', target: externalFile },
    { root: appDataDir, name: 'relative-host-file', target: '../outside.txt' },
    { root: appDataDir, name: 'absolute-internal', target: path.join(appDataDir, 'data', 'state.txt') },
    { root: appDataDir, name: 'loop-a', target: 'loop-b' },
    { root: appDataDir, name: 'loop-b', target: 'loop-a' },
    { root: appInstalledDir, name: 'config-link', target: 'config.json' },
    { root: userConfigDir, name: 'env-link', target: '/container/app.env' },
  ];

  for (const link of links) {
    await fs.promises.symlink(link.target, path.join(link.root, link.name));
  }

  const filename = await manager.createBackup(appUrn, true);
  await expect(fs.promises.readlink(path.join(appDataDir, 'container.yaml'))).resolves.toBe('/changed/after-snapshot.yaml');

  const archivePath = path.join(dataDir, 'backups', 'test-store', 'crowdsec', filename);
  const entries = await archive.listTarGz(archivePath);

  expect(entries.filter((entry) => entry.type === 'l')).toHaveLength(links.length);

  for (const directory of [appDataDir, appInstalledDir, userConfigDir]) {
    await fs.promises.rm(directory, { recursive: true });
  }
  await fs.promises.mkdir(appDataDir);
  await fs.promises.writeFile(path.join(appDataDir, 'new.txt'), 'later data');

  await expect(manager.restoreApp(appUrn, filename)).resolves.toEqual({ version: 1, ...migrationState });

  for (const link of links) {
    await expect(fs.promises.readlink(path.join(link.root, link.name))).resolves.toBe(link.target);
  }

  await expect(fs.promises.readFile(path.join(appDataDir, 'linked-data', 'state.txt'), 'utf8')).resolves.toBe('saved state');
  await expect(fs.promises.readFile(path.join(appInstalledDir, 'config-link'), 'utf8')).resolves.toBe('{}');
  await expect(fs.promises.readFile(externalFile, 'utf8')).resolves.toBe('host data');
  await expect(fs.promises.lstat(path.join(appDataDir, 'new.txt'))).rejects.toMatchObject({ code: 'ENOENT' });
  expect(repository.finishRestore).toHaveBeenCalledWith(appUrn, { version: 1, ...migrationState }, 'committed');
});
