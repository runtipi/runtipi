import { mockPlatform } from '@/tests/helpers/mock-platform';
import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppFilesManager } from '../app-files-manager';

// memfs has no /proc filesystem; native Linux coverage uses real files in separate suites.
mockPlatform('darwin');

const directories = {
  appDataDir: APP_DATA_DIR,
  appDir: APP_DIR,
  dataDir: DATA_DIR,
};

const validAppConfig = {
  id: 'demo',
  available: true,
  name: 'Demo',
  tipi_version: 1,
  short_desc: 'Demo app',
  author: 'Runtipi',
  source: 'https://example.com/demo',
};

const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content);
};

describe('AppFilesManager file security', () => {
  let manager: AppFilesManager;
  let filesystem: FilesystemService;
  let logger: { debug: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
  let configuredAppDataDir: string;

  beforeEach(() => {
    configuredAppDataDir = APP_DATA_DIR;
    logger = {
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    const configuration = {
      getConfig: vi.fn(() => ({ directories: { ...directories, appDataDir: configuredAppDataDir } })),
    } as unknown as ConfigurationService;

    const loggerService = logger as unknown as LoggerService;
    filesystem = new FilesystemService(loggerService);
    manager = new AppFilesManager(configuration, filesystem, loggerService);
  });

  it('does not expose installed app description symlink targets', async () => {
    await writeFile(path.join(DATA_DIR, 'apps', 'evil', 'demo', 'config.json'), JSON.stringify(validAppConfig));

    const descriptionPath = path.join(DATA_DIR, 'apps', 'evil', 'demo', 'metadata', 'description.md');
    await fs.promises.mkdir(path.dirname(descriptionPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), descriptionPath);

    const appInfo = await manager.getInstalledAppInfo('demo:evil' as AppUrn);

    expect(appInfo?.description).toBe('');
  });

  it('does not read app env symlink targets', async () => {
    const envPath = path.join(APP_DATA_DIR, 'evil', 'demo', 'app.env');
    await fs.promises.mkdir(path.dirname(envPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), envPath);

    const appEnv = await manager.getAppEnv('demo:evil' as AppUrn);

    expect(appEnv.content).toBeNull();
  });

  it('exposes a failed installed app folder deletion', async () => {
    vi.spyOn(filesystem, 'removeDirectory').mockResolvedValue(false);

    await expect(manager.deleteAppFolder('demo:evil' as AppUrn)).resolves.toBe(false);
  });

  it('fails when writing the generated compose file fails', async () => {
    vi.spyOn(filesystem, 'writeTextFile').mockResolvedValue(false);

    await expect(manager.writeDockerComposeYml('demo:evil' as AppUrn, 'services: {}')).rejects.toThrow(
      'Failed to write generated docker compose file for app demo:evil',
    );
  });

  it('writes recovery snapshots with owner-only permissions', async () => {
    const snapshotPath = path.join(DATA_DIR, 'private-recovery-snapshot');

    try {
      expect(await filesystem.writePrivateTextFile(snapshotPath, 'secret')).toBe(true);
      expect((await fs.promises.stat(snapshotPath)).mode & 0o777).toBe(0o600);
    } finally {
      await fs.promises.rm(snapshotPath, { force: true });
    }
  });

  it('makes app data writable without following symlinks', async () => {
    const tempDir = '/app-files-manager-permissions';
    configuredAppDataDir = tempDir;
    const appDataDir = path.join(tempDir, 'evil', 'demo');
    const writableFile = path.join(appDataDir, 'data', 'config.json');
    const externalFile = path.join(tempDir, 'external-file');
    const symlinkPath = path.join(appDataDir, 'data', 'external-link');

    try {
      await writeFile(writableFile, 'config');
      await writeFile(externalFile, 'external');
      await fs.promises.symlink(externalFile, symlinkPath);
      await fs.promises.chmod(appDataDir, 0o700);
      await fs.promises.chmod(externalFile, 0o600);

      await manager.setAppDataDirPermissions('demo:evil' as AppUrn);

      expect(logger.error).not.toHaveBeenCalled();
      expect((await fs.promises.stat(appDataDir)).mode & 0o777).toBe(0o777);
      expect((await fs.promises.stat(writableFile)).mode & 0o777).toBe(0o777);
      expect((await fs.promises.stat(externalFile)).mode & 0o777).toBe(0o600);
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  it.each(['ELOOP', 'ENXIO', 'ENOENT', 'EACCES'])('handles Linux permission entry errors: %s', async (code) => {
    const appDataDir = manager.getAppPaths('demo:evil' as AppUrn).appDataDir;
    const writableFile = path.join(appDataDir, 'writable.txt');
    await writeFile(writableFile, 'config');
    await fs.promises.chmod(writableFile, 0o600);

    const originalPlatform = process.platform;
    const open = fs.promises.open.bind(fs.promises);
    const openSpy = vi.spyOn(fs.promises, 'open').mockImplementation(async (entryPath, flags, mode) => {
      if (entryPath === appDataDir) return open(entryPath, flags, mode);
      if (String(entryPath).endsWith('/unavailable')) throw Object.assign(new Error(code), { code });

      return open(writableFile, flags, mode);
    });
    const directorySpy = vi.spyOn(fs.promises, 'opendir').mockResolvedValue(
      fromPartial<fs.Dir>({
        async *[Symbol.asyncIterator]() {
          yield fromPartial<fs.Dirent>({ name: 'unavailable' });
          yield fromPartial<fs.Dirent>({ name: 'writable.txt' });
        },
      }),
    );

    try {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      await manager.setAppDataDirPermissions('demo:evil' as AppUrn);

      if (code === 'EACCES') {
        expect(logger.error).toHaveBeenCalledWith('Error setting permissions for app demo:evil', expect.objectContaining({ code }));
        expect((await fs.promises.stat(writableFile)).mode & 0o777).toBe(0o600);
      } else {
        expect(logger.error).not.toHaveBeenCalled();
        expect((await fs.promises.stat(writableFile)).mode & 0o777).toBe(0o777);
      }
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      openSpy.mockRestore();
      directorySpy.mockRestore();
    }
  });

  it.each(['ENOENT', 'EACCES'])('handles non-Linux permission entry errors: %s', async (code) => {
    const appDataDir = manager.getAppPaths('demo:evil' as AppUrn).appDataDir;
    const vanishedFile = path.join(appDataDir, 'unavailable');
    const writableFile = path.join(appDataDir, 'writable.txt');
    await writeFile(vanishedFile, 'gone');
    await writeFile(writableFile, 'config');
    await fs.promises.chmod(writableFile, 0o600);

    const originalPlatform = process.platform;
    const lstat = fs.promises.lstat.bind(fs.promises);
    const lstatSpy = vi.spyOn(fs.promises, 'lstat').mockImplementation(async (entryPath) => {
      if (entryPath === vanishedFile) throw Object.assign(new Error(code), { code });

      return lstat(entryPath);
    });

    try {
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      await manager.setAppDataDirPermissions('demo:evil' as AppUrn);

      if (code === 'EACCES') {
        expect(logger.error).toHaveBeenCalledWith('Error setting permissions for app demo:evil', expect.objectContaining({ code }));
        expect((await fs.promises.stat(writableFile)).mode & 0o777).toBe(0o600);
      } else {
        expect(logger.error).not.toHaveBeenCalled();
        expect((await fs.promises.stat(writableFile)).mode & 0o777).toBe(0o777);
      }
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      lstatSpy.mockRestore();
    }
  });

  it('does not follow a symlinked app-data child', async () => {
    const tempDir = '/app-files-manager-symlink';
    configuredAppDataDir = tempDir;
    const appDataDir = path.join(tempDir, 'evil', 'demo');
    const symlinkPath = path.join(appDataDir, 'linked-data');
    const externalStateDir = path.join(tempDir, 'external-data');

    try {
      await fs.promises.mkdir(appDataDir, { recursive: true });
      await fs.promises.mkdir(externalStateDir, { recursive: true });
      await fs.promises.symlink(externalStateDir, symlinkPath);
      await fs.promises.chmod(externalStateDir, 0o700);

      await manager.setAppDataDirPermissions('demo:evil' as AppUrn);

      expect(logger.error).not.toHaveBeenCalled();
      expect((await fs.promises.stat(externalStateDir)).mode & 0o777).toBe(0o700);
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('does not read user config symlink targets', async () => {
    const userEnvPath = path.join(DATA_DIR, 'user-config', 'evil', 'demo', 'app.env');
    const userComposePath = path.join(DATA_DIR, 'user-config', 'evil', 'demo', 'docker-compose.yml');
    await fs.promises.mkdir(path.dirname(userEnvPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), userEnvPath);
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), userComposePath);

    const userEnv = await manager.getUserEnv('demo:evil' as AppUrn);
    const userCompose = await manager.getUserComposeFile('demo:evil' as AppUrn);

    expect(userEnv.content).toBeNull();
    expect(userCompose.content).toBeNull();
  });
});
