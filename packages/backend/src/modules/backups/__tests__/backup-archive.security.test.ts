import { mockPlatform } from '@/tests/helpers/mock-platform';
import type { DockerService } from '@/modules/docker/docker.service';
import { mock } from 'vitest-mock-extended';
import { fromPartial } from '@total-typescript/shoehorn';
import fs from 'node:fs';
import path from 'node:path';
import { createAppUrn } from '@/common/helpers/app-helpers';
import type { ArchiveService } from '@/core/archive/archive.service';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppsRepository } from '@/modules/apps/apps.repository';
import { describe, expect, it, vi } from 'vitest';
import { BackupManager } from '../backup.manager';
import { BackupArchive } from '../backup-archive';

// memfs has no /proc filesystem; native Linux coverage uses real files in separate suites.
mockPlatform('darwin');

const mockBackupTempDirectories = (filesystem: FilesystemService, temporaryBackupDir: string) => {
  return vi.spyOn(filesystem, 'createTempDirectory').mockImplementation(async (prefix) => {
    if (!prefix.endsWith('.runtipi-backup-')) {
      return temporaryBackupDir;
    }

    const privateStagingDir = `${prefix}private`;
    await fs.promises.mkdir(privateStagingDir, { recursive: true, mode: 0o700 });
    return privateStagingDir;
  });
};

const createLogger = () =>
  ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }) as unknown as LoggerService;

const appsRepository = {
  getMigrationState: vi.fn().mockResolvedValue({ initialized: false, migrationIds: [] }),
  getRestoreJournal: vi.fn().mockResolvedValue(undefined),
  createRestoreJournal: vi.fn().mockResolvedValue(undefined),
  finishRestore: vi.fn().mockResolvedValue(undefined),
  clearRestoreJournal: vi.fn().mockResolvedValue(undefined),
} as unknown as AppsRepository;

describe('BackupArchive file handle cleanup', () => {
  it.each(['backup', 'restore'] as const)('preserves the %s failure when closing the source also fails', async (operation) => {
    const logger = createLogger();
    const archive = new BackupArchive(new FilesystemService(logger), logger);
    const copyError = new Error('Failed to inspect source');
    const closeError = new Error('Failed to close source');
    const handle = fromPartial<fs.promises.FileHandle>({
      stat: vi.fn().mockRejectedValue(copyError),
      close: vi.fn().mockRejectedValue(closeError),
    });
    const open = vi.spyOn(fs.promises, 'open').mockResolvedValue(handle);
    const originalPlatform = process.platform;

    try {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      if (operation === 'backup') {
        await expect(archive.stageBackupDirectory('/source', '/destination', 'app data')).rejects.toMatchObject({ cause: copyError });
      } else {
        await expect(archive.copyRestoreArchive('/source', '/destination')).rejects.toBe(copyError);
      }

      expect(handle.close).toHaveBeenCalledOnce();
      expect(logger.warn).toHaveBeenCalledWith('Failed to close backup file /source', closeError);
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      open.mockRestore();
    }
  });

  it('keeps a successfully copied restore archive when closing the source fails', async () => {
    const logger = createLogger();
    const archive = new BackupArchive(new FilesystemService(logger), logger);
    const closeError = new Error('Failed to close source');
    const handle = fromPartial<fs.promises.FileHandle>({
      fd: 1,
      stat: vi.fn().mockResolvedValue({ isFile: () => true }),
      close: vi.fn().mockRejectedValue(closeError),
    });
    const open = vi.spyOn(fs.promises, 'open').mockResolvedValue(handle);
    const mkdir = vi.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
    const copyFile = vi.spyOn(fs.promises, 'copyFile').mockResolvedValue();
    const originalPlatform = process.platform;

    try {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await expect(archive.copyRestoreArchive('/source', '/destination')).resolves.toBeUndefined();

      expect(copyFile).toHaveBeenCalledWith('/proc/self/fd/1', '/destination');
      expect(handle.close).toHaveBeenCalledOnce();
      expect(logger.warn).toHaveBeenCalledWith('Failed to close backup file /source', closeError);
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      open.mockRestore();
      mkdir.mockRestore();
      copyFile.mockRestore();
    }
  });
});

describe('BackupManager backup source validation', () => {
  const appUrn = createAppUrn('test-app', 'test-store');

  it('preserves contained symlinks as archive links', async () => {
    await fs.promises.mkdir('/tmp', { recursive: true });
    const rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-source-');
    const appDataDir = path.join(rootDir, 'app-data');
    const appInstalledDir = path.join(rootDir, 'app');
    const temporaryBackupDir = path.join(rootDir, 'temporary-backup');
    const sourceFile = path.join(appDataDir, 'source.txt');
    const symlinkPath = path.join(appDataDir, 'contained-link.txt');
    const logger = createLogger();
    const filesystem = new FilesystemService(logger);
    let copiedLinkStats: fs.Stats | undefined;
    const archiveManager = {
      createTarGz: vi.fn(async (_sourceDir: string, archivePath: string) => {
        copiedLinkStats = await fs.promises.lstat(path.join(temporaryBackupDir, 'content', 'app-data', 'contained-link.txt'));
        await fs.promises.writeFile(archivePath, 'archive');
        return { stdout: '', stderr: '' };
      }),
      listTarGz: vi.fn().mockResolvedValue([
        { path: './app-data/', type: 'd' },
        { path: './app/', type: 'd' },
      ]),
    } as unknown as ArchiveService;
    const config = {
      get: vi.fn().mockReturnValue({ dataDir: rootDir }),
    } as unknown as ConfigurationService;
    const appFilesManager = {
      getAppPaths: vi.fn().mockReturnValue({ appDataDir, appInstalledDir }),
    } as unknown as AppFilesManager;
    const backupManager = new BackupManager(archiveManager, logger, config, filesystem, appFilesManager, appsRepository, mock<DockerService>());

    try {
      await fs.promises.mkdir(appDataDir, { recursive: true });
      await fs.promises.mkdir(appInstalledDir, { recursive: true });
      await fs.promises.writeFile(sourceFile, 'source');
      await fs.promises.writeFile(path.join(appInstalledDir, 'config.json'), '{}');
      await fs.promises.symlink(sourceFile, symlinkPath);

      mockBackupTempDirectories(filesystem, temporaryBackupDir);

      await expect(backupManager.backupApp(appUrn)).resolves.toMatch(/\.tar\.gz$/);

      expect(copiedLinkStats?.isSymbolicLink()).toBe(true);
    } finally {
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });

  it('rejects an app-data file hardlinked outside the app before copying or publishing an archive', async () => {
    await fs.promises.mkdir('/tmp', { recursive: true });
    const rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-source-');
    const appDataDir = path.join(rootDir, 'app-data');
    const appInstalledDir = path.join(rootDir, 'app');
    const temporaryBackupDir = path.join(rootDir, 'temporary-backup');
    const sourceFile = path.join(appDataDir, 'source.txt');
    const externalLink = path.join(rootDir, 'external.txt');
    const logger = createLogger();
    const filesystem = new FilesystemService(logger);
    const archiveManager = {
      createTarGz: vi.fn(),
      listTarGz: vi.fn(),
    } as unknown as ArchiveService;
    const config = { get: vi.fn().mockReturnValue({ dataDir: rootDir }) } as unknown as ConfigurationService;
    const appFilesManager = {
      getAppPaths: vi.fn().mockReturnValue({ appDataDir, appInstalledDir }),
    } as unknown as AppFilesManager;
    const backupManager = new BackupManager(archiveManager, logger, config, filesystem, appFilesManager, appsRepository, mock<DockerService>());
    const copyFile = vi.spyOn(fs.promises, 'copyFile');

    try {
      await fs.promises.mkdir(appDataDir, { recursive: true });
      await fs.promises.mkdir(appInstalledDir, { recursive: true });
      await fs.promises.writeFile(sourceFile, 'source');
      await fs.promises.link(sourceFile, externalLink);
      mockBackupTempDirectories(filesystem, temporaryBackupDir);

      await expect(backupManager.backupApp(appUrn)).rejects.toThrow('Failed to copy app data for backup');

      expect(copyFile).not.toHaveBeenCalled();
      expect(archiveManager.createTarGz).not.toHaveBeenCalled();
    } finally {
      copyFile.mockRestore();
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });

  it('rejects a hardlink from the Linux no-follow handle before copying', async () => {
    const logger = createLogger();
    const manager = new BackupArchive(new FilesystemService(logger), logger);
    const copySourceToQuarantine = (
      manager as unknown as { copySourceToQuarantine: (source: string, destination: string) => Promise<void> }
    ).copySourceToQuarantine.bind(manager);
    const sourceHandle = {
      close: vi.fn().mockResolvedValue(undefined),
      fd: 1,
      stat: vi.fn().mockResolvedValue({ isDirectory: () => false, isFile: () => true, nlink: 2 }),
    } as unknown as fs.promises.FileHandle;
    const open = vi.spyOn(fs.promises, 'open').mockResolvedValue(sourceHandle);
    const copyFileFromHandle = vi.spyOn(manager as unknown as { copyFileFromHandle: () => Promise<void> }, 'copyFileFromHandle');
    const originalPlatform = process.platform;

    try {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await expect(copySourceToQuarantine('/source.txt', '/quarantine/source.txt')).rejects.toThrow('Backup contains unsupported file types');

      expect(sourceHandle.stat).toHaveBeenCalled();
      expect(copyFileFromHandle).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      open.mockRestore();
      copyFileFromHandle.mockRestore();
    }
  });

  it('rejects a hardlink in the non-Linux fallback before copying', async () => {
    await fs.promises.mkdir('/tmp', { recursive: true });
    const rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-source-');
    const source = path.join(rootDir, 'source.txt');
    const destination = path.join(rootDir, 'quarantine', 'source.txt');
    const externalLink = path.join(rootDir, 'external.txt');
    const logger = createLogger();
    const manager = new BackupArchive(new FilesystemService(logger), logger);
    const copySourceToQuarantineOutsideLinux = (
      manager as unknown as { copySourceToQuarantineOutsideLinux: (source: string, destination: string) => Promise<void> }
    ).copySourceToQuarantineOutsideLinux.bind(manager);
    const copyFile = vi.spyOn(fs.promises, 'copyFile');

    try {
      await fs.promises.writeFile(source, 'source');
      await fs.promises.link(source, externalLink);

      await expect(copySourceToQuarantineOutsideLinux(source, destination)).rejects.toThrow('Backup contains unsupported file types');

      expect(copyFile).not.toHaveBeenCalled();
      await expect(fs.promises.access(destination)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      copyFile.mockRestore();
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });
});
