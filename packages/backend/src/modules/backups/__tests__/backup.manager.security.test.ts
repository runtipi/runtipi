import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import { createAppUrn } from '@/common/helpers/app-helpers';
import type { ArchiveService } from '@/core/archive/archive.service';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppUrn } from '@runtipi/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupManager } from '../backup.manager';

const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content);
};

const createLogger = () =>
  ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }) as unknown as LoggerService;

describe('BackupManager file security', () => {
  let manager: BackupManager;

  beforeEach(() => {
    const logger = createLogger();

    const config = {
      get: vi.fn().mockReturnValue({ dataDir: DATA_DIR }),
    } as unknown as ConfigurationService;

    manager = new BackupManager({} as ArchiveService, logger, config, new FilesystemService(logger), {} as AppFilesManager);
  });

  it('does not return backup paths for symlink targets', async () => {
    const backupPath = path.join(DATA_DIR, 'backups', 'store', 'demo', 'demo-store-1.tar.gz');
    await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), backupPath);

    await expect(manager.getBackupPath('demo:store' as AppUrn, 'demo-store-1.tar.gz')).rejects.toThrow('The backup file does not exist');
  });

  it('still returns regular backup file paths', async () => {
    const backupPath = path.join(DATA_DIR, 'backups', 'store', 'demo', 'demo-store-1.tar.gz');
    await writeFile(backupPath, 'backup');

    await expect(manager.getBackupPath('demo:store' as AppUrn, 'demo-store-1.tar.gz')).resolves.toBe(backupPath);
  });
});

describe('BackupManager restore security', () => {
  const appUrn = createAppUrn('test-app', 'test-store');

  let rootDir: string;
  let dataDir: string;
  let restoreDir: string;
  let appDataDir: string;
  let appInstalledDir: string;
  let userConfigDir: string;
  let archivePath: string;
  let backupManager: BackupManager;
  let extractTarGz: ReturnType<typeof vi.fn>;
  let listTarGz: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await fs.promises.mkdir('/tmp', { recursive: true });
    rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-test-');
    dataDir = path.join(rootDir, 'data');
    restoreDir = path.join(rootDir, 'restore');
    appDataDir = path.join(rootDir, 'app-data', 'test-store', 'test-app');
    appInstalledDir = path.join(rootDir, 'apps', 'test-store', 'test-app');
    userConfigDir = path.join(dataDir, 'user-config', 'test-store', 'test-app');
    archivePath = path.join(dataDir, 'backups', 'test-store', 'test-app', 'backup.tar.gz');

    const logger = createLogger();
    const filesystem = new FilesystemService(logger);
    extractTarGz = vi.fn();
    listTarGz = vi.fn().mockResolvedValue([
      { path: './app-data/', type: 'd' },
      { path: './app/', type: 'd' },
    ]);

    const archiveManager = {
      extractTarGz,
      listTarGz,
    } as unknown as ArchiveService;

    const config = {
      get: vi.fn().mockReturnValue({ dataDir, appDataDir: path.join(rootDir, 'app-data'), appDir: path.join(rootDir, 'apps') }),
    } as unknown as ConfigurationService;

    const appFilesManager = {
      getAppPaths: vi.fn().mockReturnValue({ appDataDir, appInstalledDir }),
    } as unknown as AppFilesManager;

    vi.spyOn(filesystem, 'createTempDirectory').mockResolvedValue(restoreDir);

    await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });
    await fs.promises.writeFile(archivePath, '');
    await fs.promises.mkdir(appDataDir, { recursive: true });
    await fs.promises.mkdir(appInstalledDir, { recursive: true });
    await fs.promises.mkdir(userConfigDir, { recursive: true });
    await fs.promises.writeFile(path.join(userConfigDir, 'app.env'), 'EXISTING=true\n');

    backupManager = new BackupManager(archiveManager, logger, config, filesystem, appFilesManager);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (rootDir) {
      await fs.promises.rm(rootDir, { recursive: true, force: true });
    }
  });

  it('rejects restored backups containing user-config symlinks before extracting', async () => {
    const targetFile = path.join(dataDir, 'state', 'proof.txt');
    await fs.promises.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.promises.writeFile(targetFile, 'unchanged\n');

    listTarGz.mockResolvedValue([{ path: './user-config/app.env', type: 'l' }]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains unsupported file types');

    expect(extractTarGz).not.toHaveBeenCalled();
    await expect(fs.promises.readFile(path.join(userConfigDir, 'app.env'), 'utf8')).resolves.toBe('EXISTING=true\n');
    await expect(fs.promises.readFile(targetFile, 'utf8')).resolves.toBe('unchanged\n');
  });

  it('rejects unsupported archive entry types even when the entry path is empty', async () => {
    listTarGz.mockResolvedValue([{ path: '', type: 'l' }]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains unsupported file types');

    expect(extractTarGz).not.toHaveBeenCalled();
  });

  it('rejects restored app-data symlinks before extracting', async () => {
    const targetFile = path.join(dataDir, 'state', 'proof.txt');
    const liveFile = path.join(appDataDir, 'data', 'live.txt');
    await fs.promises.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.promises.mkdir(path.dirname(liveFile), { recursive: true });
    await fs.promises.writeFile(targetFile, 'unchanged\n');
    await fs.promises.writeFile(liveFile, 'live data\n');

    listTarGz.mockResolvedValue([{ path: './app-data/proof.txt', type: 'l' }]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains unsupported file types');

    expect(extractTarGz).not.toHaveBeenCalled();
    await expect(fs.promises.readFile(liveFile, 'utf8')).resolves.toBe('live data\n');
    await expect(fs.promises.readFile(targetFile, 'utf8')).resolves.toBe('unchanged\n');
  });

  it('rejects restored backups containing app hardlinks before extracting', async () => {
    listTarGz.mockResolvedValue([{ path: './app/docker-compose.yml', type: 'h' }]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains unsupported file types');

    expect(extractTarGz).not.toHaveBeenCalled();
  });

  it('rejects restored backups containing paths outside the restore root before extracting', async () => {
    listTarGz.mockResolvedValue([{ path: '../state/proof.txt', type: '-' }]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains unsupported file types');

    expect(extractTarGz).not.toHaveBeenCalled();
  });

  it('restores backups containing regular files and directories', async () => {
    listTarGz.mockResolvedValue([
      { path: './app-data/', type: 'd' },
      { path: './app-data/data/', type: 'd' },
      { path: './app-data/data/file.txt', type: '-' },
      { path: './app/', type: 'd' },
      { path: './app/docker-compose.yml', type: '-' },
      { path: './user-config/', type: 'd' },
      { path: './user-config/app.env', type: '-' },
    ]);

    extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
      await fs.promises.mkdir(path.join(destinationDir, 'app-data', 'data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'user-config'), { recursive: true });
      await fs.promises.writeFile(path.join(destinationDir, 'app-data', 'data', 'file.txt'), 'restored data\n');
      await fs.promises.writeFile(path.join(destinationDir, 'app', 'docker-compose.yml'), 'services: {}\n');
      await fs.promises.writeFile(path.join(destinationDir, 'user-config', 'app.env'), 'RESTORED=true\n');

      return { stdout: '', stderr: '' };
    });

    await backupManager.restoreApp(appUrn, 'backup.tar.gz');

    await expect(fs.promises.readFile(path.join(appDataDir, 'data', 'file.txt'), 'utf8')).resolves.toBe('restored data\n');
    await expect(fs.promises.readFile(path.join(appInstalledDir, 'docker-compose.yml'), 'utf8')).resolves.toBe('services: {}\n');
    await expect(fs.promises.readFile(path.join(userConfigDir, 'app.env'), 'utf8')).resolves.toBe('RESTORED=true\n');
  });
});
