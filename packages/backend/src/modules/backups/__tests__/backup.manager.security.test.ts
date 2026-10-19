import type { DockerService } from '@/modules/docker/docker.service';
import { mock } from 'vitest-mock-extended';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import { createAppUrn } from '@/common/helpers/app-helpers';
import type { ArchiveService } from '@/core/archive/archive.service';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppsRepository } from '@/modules/apps/apps.repository';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupManager } from '../backup.manager';
import { BackupArchive } from '../backup-archive';

const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content);
};

const _mockBackupTempDirectories = (filesystem: FilesystemService, temporaryBackupDir: string) => {
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

describe('BackupManager file security', () => {
  let manager: BackupManager;

  beforeEach(() => {
    const logger = createLogger();

    const config = {
      get: vi.fn().mockReturnValue({ dataDir: DATA_DIR }),
    } as unknown as ConfigurationService;

    manager = new BackupManager(
      {} as ArchiveService,
      logger,
      config,
      new FilesystemService(logger),
      {} as AppFilesManager,
      appsRepository,
      mock<DockerService>(),
    );
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

describe('BackupManager backup uploads', () => {
  const appUrn = createAppUrn('upload-test-app', 'upload-test-store');
  const filename = 'upload-test-app-upload-test-store.tar.gz';
  const backupPath = path.join(DATA_DIR, 'backups', 'upload-test-store', 'upload-test-app', filename);

  let manager: BackupManager;
  let filesystem: FilesystemService;
  let logger: LoggerService;

  beforeEach(() => {
    logger = createLogger();
    filesystem = new FilesystemService(logger);
    const config = {
      get: vi.fn().mockReturnValue({ dataDir: DATA_DIR }),
    } as unknown as ConfigurationService;

    manager = new BackupManager({} as ArchiveService, logger, config, filesystem, {} as AppFilesManager, appsRepository, mock<DockerService>());
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.promises.rm(path.dirname(backupPath), { force: true, recursive: true });
  });

  it('preserves an existing backup when atomic publication reports EEXIST', async () => {
    const existingBackup = Buffer.from('existing backup');
    const upload = Buffer.from('replacement upload');
    await writeFile(backupPath, existingBackup.toString());
    const writeBinaryFile = vi.spyOn(filesystem, 'writeBinaryFile');
    const pathExists = vi.spyOn(filesystem, 'pathExists');
    const link = vi.spyOn(fs.promises, 'link');

    await expect(manager.uploadBackup(appUrn, filename, upload)).rejects.toThrow('A backup with this filename already exists');

    await expect(fs.promises.readFile(backupPath)).resolves.toEqual(existingBackup);
    expect(link).toHaveBeenCalledWith(expect.stringMatching(/\.runtipi-backup-.+\/.+\.tar\.gz$/), backupPath);
    expect(writeBinaryFile).not.toHaveBeenCalled();
    expect(pathExists).not.toHaveBeenCalled();
  });

  it('writes uploads exclusively with private permissions before atomic publication', async () => {
    const upload = Buffer.from('uploaded backup');
    const writeFile = vi.spyOn(fs.promises, 'writeFile');

    await manager.uploadBackup(appUrn, filename, upload);

    expect(writeFile).toHaveBeenCalledWith(expect.stringMatching(/\.runtipi-backup-.+\/.+\.tar\.gz$/), upload, {
      flag: 'wx',
      mode: 0o600,
    });
  });

  it('does not publish a partial write and allows retry', async () => {
    const writeError = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    const realWriteFile = fs.promises.writeFile;
    vi.spyOn(fs.promises, 'writeFile').mockImplementationOnce(async (filePath, data, options) => {
      await realWriteFile(filePath, data, options);
      throw writeError;
    });

    await expect(manager.uploadBackup(appUrn, filename, Buffer.from('uploaded backup'))).rejects.toBe(writeError);

    await expect(fs.promises.access(backupPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.promises.readdir(path.dirname(backupPath))).resolves.toEqual([]);
    await expect(manager.listBackupsByAppId(appUrn)).resolves.toEqual([]);
    await expect(manager.uploadBackup(appUrn, filename, Buffer.from('retry'))).resolves.toBeUndefined();
    await expect(fs.promises.readFile(backupPath)).resolves.toEqual(Buffer.from('retry'));
  });

  it('publishes a complete staged upload atomically', async () => {
    const upload = Buffer.from('uploaded backup');
    const link = vi.spyOn(fs.promises, 'link');

    await manager.uploadBackup(appUrn, filename, upload);

    expect(link).toHaveBeenCalledWith(expect.stringMatching(/\.runtipi-backup-.+\/.+\.tar\.gz$/), backupPath);
    await expect(fs.promises.readFile(backupPath)).resolves.toEqual(upload);
  });

  it('preserves the write failure when staging cleanup also fails', async () => {
    const error = new Error('disk full');
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(error);
    vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(false);

    await expect(manager.uploadBackup(appUrn, filename, Buffer.from('upload'))).rejects.toBe(error);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('keeps a successfully published upload when private cleanup fails', async () => {
    vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(false);

    await manager.uploadBackup(appUrn, filename, Buffer.from('upload'));

    await expect(fs.promises.readFile(backupPath, 'utf8')).resolves.toBe('upload');
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('BackupManager backup publication', () => {
  const appUrn = createAppUrn('test-app', 'test-store');

  const setup = () => {
    const logger = createLogger();
    const filesystem = new FilesystemService(logger);
    vi.spyOn(filesystem, 'createTempDirectory')
      .mockResolvedValueOnce('/tmp/backup')
      .mockResolvedValueOnce('/data/backups/test-store/test-app/.runtipi-backup-private');
    vi.spyOn(filesystem, 'createDirectory').mockResolvedValue(true);
    vi.spyOn(filesystem, 'copyFile').mockResolvedValue(true);
    vi.spyOn(filesystem, 'isDirectory').mockResolvedValue(false);
    vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(true);
    vi.spyOn(filesystem, 'writeJsonFile').mockResolvedValue(true);
    const publish = vi.spyOn(fs.promises, 'link').mockResolvedValue(undefined);
    const stage = vi.spyOn(BackupArchive.prototype, 'stageBackupDirectory').mockResolvedValue();
    vi.spyOn(BackupArchive.prototype, 'validateRestoreDirectory').mockResolvedValue();
    const archive = {
      createTarGz: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
      listTarGz: vi.fn().mockResolvedValue([
        { path: './app-data/', type: 'd' },
        { path: './app/', type: 'd' },
      ]),
    };
    const files = fromPartial<AppFilesManager>({
      getAppPaths: () => ({ appDataDir: '/app-data/test-store/test-app', appInstalledDir: '/data/apps/test-store/test-app' }),
    });
    const config = { get: () => ({ dataDir: '/data' }) } as unknown as ConfigurationService;
    const manager = new BackupManager(archive as unknown as ArchiveService, logger, config, filesystem, files, appsRepository, mock<DockerService>());

    return { manager, filesystem, archive, publish, stage, logger };
  };

  afterEach(() => vi.restoreAllMocks());

  it('archives only the content subdirectory and publishes the complete private copy', async () => {
    const { manager, archive, publish } = setup();

    const filename = await manager.backupApp(appUrn);

    expect(archive.createTarGz).toHaveBeenCalledWith('/tmp/backup/content', `/tmp/backup/${filename}`, undefined);
    expect(publish).toHaveBeenCalledWith(
      `/data/backups/test-store/test-app/.runtipi-backup-private/${filename}`,
      `/data/backups/test-store/test-app/${filename}`,
    );
  });

  it('cleans acquired resources when the archive copy fails', async () => {
    const { manager, filesystem, publish } = setup();
    vi.spyOn(filesystem, 'copyFile').mockResolvedValue(false);

    await expect(manager.backupApp(appUrn)).rejects.toThrow('Failed to copy backup archive');
    expect(publish).not.toHaveBeenCalled();
    expect(filesystem.removeDirectory).toHaveBeenCalledWith('/tmp/backup');
    expect(filesystem.removeDirectory).toHaveBeenCalledWith('/data/backups/test-store/test-app/.runtipi-backup-private');
  });

  it('preserves capture failures even when cleanup fails', async () => {
    const { manager, filesystem, stage, publish, logger } = setup();
    const error = new Error('capture failed');
    stage.mockRejectedValueOnce(error);
    vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(false);

    await expect(manager.backupApp(appUrn)).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('publishes a valid backup even when temporary cleanup fails', async () => {
    const { manager, filesystem, publish, logger } = setup();
    vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(false);

    await expect(manager.backupApp(appUrn)).resolves.toMatch(/\.tar\.gz$/);
    expect(publish).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does not publish an archive that restore validation would reject', async () => {
    const { manager, archive, publish } = setup();
    archive.listTarGz.mockResolvedValue([{ path: './escape', type: 'l' }]);

    await expect(manager.backupApp(appUrn)).rejects.toThrow('unsupported file types');
    expect(publish).not.toHaveBeenCalled();
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
  let filesystem: FilesystemService;
  let extractTarGz: ReturnType<typeof vi.fn>;
  let listTarGz: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const repository = appsRepository as unknown as {
      getMigrationState: ReturnType<typeof vi.fn>;
      getRestoreJournal: ReturnType<typeof vi.fn>;
      createRestoreJournal: ReturnType<typeof vi.fn>;
      finishRestore: ReturnType<typeof vi.fn>;
      clearRestoreJournal: ReturnType<typeof vi.fn>;
    };
    repository.getMigrationState.mockReset().mockResolvedValue({ initialized: false, migrationIds: [] });
    let journal: unknown;
    repository.getRestoreJournal.mockReset().mockImplementation(async () => journal);
    repository.createRestoreJournal.mockReset().mockImplementation(async (_appUrn, previousState, targetState, directories) => {
      journal = { phase: 'prepared', previousState, targetState, directories };
    });
    repository.finishRestore.mockReset().mockImplementation(async (_appUrn, _state, phase) => {
      (journal as { phase: string }).phase = phase;
    });
    repository.clearRestoreJournal.mockReset().mockImplementation(async () => {
      journal = undefined;
    });

    await fs.promises.mkdir('/tmp', { recursive: true });
    rootDir = await fs.promises.mkdtemp('/tmp/runtipi-backup-test-');
    dataDir = path.join(rootDir, 'data');
    restoreDir = path.join(rootDir, 'restore');
    appDataDir = path.join(rootDir, 'app-data', 'test-store', 'test-app');
    appInstalledDir = path.join(rootDir, 'apps', 'test-store', 'test-app');
    userConfigDir = path.join(dataDir, 'user-config', 'test-store', 'test-app');
    archivePath = path.join(dataDir, 'backups', 'test-store', 'test-app', 'backup.tar.gz');

    const logger = createLogger();
    filesystem = new FilesystemService(logger);
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

    backupManager = new BackupManager(archiveManager, logger, config, filesystem, appFilesManager, appsRepository, mock<DockerService>());
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

  it('preserves archive validation errors when pinned archive cleanup fails', async () => {
    listTarGz.mockResolvedValue([{ path: './app-data/proof.txt', type: 'l' }]);
    vi.spyOn(fs.promises, 'unlink').mockRejectedValue(new Error('cleanup failed'));

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains unsupported file types');
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

  it('rejects duplicate normalized archive paths before extracting', async () => {
    listTarGz.mockResolvedValue([
      { path: './app-data/file.txt', type: '-' },
      { path: 'app-data/file.txt', type: '-' },
    ]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains duplicate file paths');

    expect(extractTarGz).not.toHaveBeenCalled();
  });

  it('rejects duplicate archive paths that differ only by a trailing separator', async () => {
    listTarGz.mockResolvedValue([
      { path: './app-data/data', type: 'd' },
      { path: './app-data/data/', type: 'd' },
    ]);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Backup contains duplicate file paths');

    expect(extractTarGz).not.toHaveBeenCalled();
  });

  it('restores only the private archive copy when the backup path is swapped after pinning', async () => {
    await fs.promises.writeFile(archivePath, 'validated archive');
    listTarGz.mockImplementation(async (archive: string) => {
      expect(archive).not.toBe(archivePath);
      await fs.promises.writeFile(archivePath, 'unvalidated archive');
      return [
        { path: './app-data/', type: 'd' },
        { path: './app/', type: 'd' },
      ];
    });
    extractTarGz.mockImplementation(async (archive: string, destinationDir: string) => {
      await expect(fs.promises.readFile(archive, 'utf8')).resolves.toBe('validated archive');
      await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      return { stdout: '', stderr: '' };
    });

    await backupManager.restoreApp(appUrn, 'backup.tar.gz');

    expect(listTarGz).toHaveBeenCalledWith(expect.stringContaining('.runtipi-restore-archive.tar.gz'));
    expect(extractTarGz).toHaveBeenCalledWith(expect.stringContaining('.runtipi-restore-archive.tar.gz'), path.join(restoreDir, 'extracted'));
  });

  it('keeps the pinned archive private when extraction changes the root mode', async () => {
    const createTempDirectory = vi.spyOn(filesystem, 'createTempDirectory');
    createTempDirectory.mockRestore();
    const restoreParentDir = await filesystem.createTempDirectory(path.join(rootDir, 'restore-parent-'));
    if (!restoreParentDir) {
      throw new Error('Failed to create restore parent directory');
    }
    expect((await fs.promises.stat(restoreParentDir)).mode & 0o777).toBe(0o700);
    vi.spyOn(filesystem, 'createTempDirectory').mockResolvedValue(restoreParentDir);
    await fs.promises.writeFile(archivePath, 'validated archive');

    extractTarGz.mockImplementation(async (pinnedArchive: string, extractionDir: string) => {
      expect(extractionDir).toBe(path.join(restoreParentDir, 'extracted'));
      expect(pinnedArchive).toBe(path.join(restoreParentDir, '.runtipi-restore-archive.tar.gz'));
      await fs.promises.chmod(extractionDir, 0o755);
      await expect(fs.promises.readFile(pinnedArchive, 'utf8')).resolves.toBe('validated archive');
      expect(path.relative(extractionDir, pinnedArchive).startsWith('..')).toBe(true);
      expect((await fs.promises.stat(path.dirname(pinnedArchive))).mode & 0o777).toBe(0o700);
      await fs.promises.mkdir(path.join(extractionDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(extractionDir, 'app'), { recursive: true });
      return { stdout: '', stderr: '' };
    });

    await backupManager.restoreApp(appUrn, 'backup.tar.gz');
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

  it('returns versioned migration metadata from a restored backup', async () => {
    listTarGz.mockResolvedValue([
      { path: './app-data/', type: 'd' },
      { path: './app/', type: 'd' },
      { path: './runtipi-migrations.json', type: '-' },
    ]);
    extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
      await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      await fs.promises.writeFile(
        path.join(destinationDir, 'runtipi-migrations.json'),
        JSON.stringify({ version: 1, initialized: true, migrationIds: ['database-v2'] }),
      );
      return { stdout: '', stderr: '' };
    });

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).resolves.toEqual({
      version: 1,
      initialized: true,
      migrationIds: ['database-v2'],
    });
  });

  it('preserves a restore failure when temporary restore cleanup also fails', async () => {
    vi.spyOn(filesystem, 'createDirectory').mockResolvedValue(false);
    const removeDirectory = vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(false);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Failed to create temporary restore directory');

    expect(removeDirectory).toHaveBeenCalledWith(restoreDir);
  });

  it('keeps live directories when staging restored data fails', async () => {
    const liveFile = path.join(appDataDir, 'live.txt');
    await fs.promises.writeFile(liveFile, 'live data\n');
    extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
      await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      return { stdout: '', stderr: '' };
    });
    vi.spyOn(filesystem, 'copyDirectory').mockResolvedValue(false);

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('Failed to copy restored app data');
    await expect(fs.promises.readFile(liveFile, 'utf8')).resolves.toBe('live data\n');
  });

  it('restores every live directory when a replacement swap fails', async () => {
    const liveDataFile = path.join(appDataDir, 'live.txt');
    const liveAppFile = path.join(appInstalledDir, 'live.txt');
    await fs.promises.writeFile(liveDataFile, 'live data\n');
    await fs.promises.writeFile(liveAppFile, 'live app\n');
    extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
      await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      await fs.promises.writeFile(path.join(destinationDir, 'app-data', 'new.txt'), 'new data\n');
      await fs.promises.writeFile(path.join(destinationDir, 'app', 'new.txt'), 'new app\n');
      return { stdout: '', stderr: '' };
    });
    const rename = fs.promises.rename.bind(fs.promises);
    vi.spyOn(fs.promises, 'rename').mockImplementation(async (source, destination) => {
      const sourcePath = String(source);
      const isStagedApp = sourcePath.includes('.test-app.restore-') && !sourcePath.includes('.previous');
      if (isStagedApp && destination === appInstalledDir) {
        throw new Error('swap failed');
      }
      return rename(source, destination);
    });

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('swap failed');
    await expect(fs.promises.readFile(liveDataFile, 'utf8')).resolves.toBe('live data\n');
    await expect(fs.promises.readFile(liveAppFile, 'utf8')).resolves.toBe('live app\n');
    await expect(fs.promises.readFile(path.join(userConfigDir, 'app.env'), 'utf8')).resolves.toBe('EXISTING=true\n');
  });

  it('restores the original files if the ledger transaction fails', async () => {
    await fs.promises.writeFile(path.join(appDataDir, 'live.txt'), 'original');
    extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
      await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      await fs.promises.writeFile(path.join(destinationDir, 'app-data', 'live.txt'), 'restored');
      return { stdout: '', stderr: '' };
    });
    const finish = vi.mocked(appsRepository.finishRestore).mockRejectedValueOnce(new Error('ledger failed'));

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('ledger failed');

    await expect(fs.promises.readFile(path.join(appDataDir, 'live.txt'), 'utf8')).resolves.toBe('original');
    expect(finish).toHaveBeenLastCalledWith(appUrn, { initialized: false, migrationIds: [] }, 'recovered');
  });

  it.each(['absent', 'present', 'unavailable'] as const)(
    'cleans staging after a failed journal insert only when the journal is absent: %s',
    async (state) => {
      await fs.promises.writeFile(path.join(appDataDir, 'live.txt'), 'original');
      extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
        await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
        await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
        return { stdout: '', stderr: '' };
      });
      const createJournal = vi.mocked(appsRepository.createRestoreJournal).getMockImplementation();
      vi.mocked(appsRepository.createRestoreJournal).mockImplementationOnce(async (...args) => {
        if (state === 'present') await createJournal?.(...args);
        if (state === 'unavailable') {
          vi.mocked(appsRepository.getRestoreJournal).mockRejectedValueOnce(new Error('lookup unavailable'));
        }
        throw new Error('database disconnected');
      });

      await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).rejects.toThrow('database disconnected');

      await expect(fs.promises.readFile(path.join(appDataDir, 'live.txt'), 'utf8')).resolves.toBe('original');
      for (const destination of [appDataDir, appInstalledDir, userConfigDir]) {
        const entries = await fs.promises.readdir(path.dirname(destination));
        expect(entries.some((entry) => entry.startsWith(`.${path.basename(destination)}.restore-`))).toBe(state !== 'absent');
      }
      expect(appsRepository.finishRestore).not.toHaveBeenCalled();
    },
  );

  it('reports success and retries committed cleanup without replacing the ledger', async () => {
    extractTarGz.mockImplementation(async (_archive: string, destinationDir: string) => {
      await fs.promises.mkdir(path.join(destinationDir, 'app-data'), { recursive: true });
      await fs.promises.mkdir(path.join(destinationDir, 'app'), { recursive: true });
      await fs.promises.writeFile(path.join(destinationDir, 'app-data', 'new.txt'), 'restored');
      return { stdout: '', stderr: '' };
    });
    const remove = vi.spyOn(filesystem, 'removeDirectory').mockImplementation(async (directory) => !directory.includes('.restore-'));

    await expect(backupManager.restoreApp(appUrn, 'backup.tar.gz')).resolves.toBeNull();
    expect(appsRepository.clearRestoreJournal).not.toHaveBeenCalled();
    await expect(fs.promises.readFile(path.join(appDataDir, 'new.txt'), 'utf8')).resolves.toBe('restored');

    remove.mockRestore();
    await backupManager.reconcileRestore(appUrn);
    expect(appsRepository.clearRestoreJournal).toHaveBeenCalledOnce();
    expect(appsRepository.finishRestore).toHaveBeenCalledTimes(1);
    await expect(fs.promises.readFile(path.join(appDataDir, 'new.txt'), 'utf8')).resolves.toBe('restored');
  });
});
