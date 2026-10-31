import fs from 'node:fs';
import path from 'node:path';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppFilesManager } from '../app-files-manager';

vi.unmock('fs');
vi.unmock('node:fs');

test.runIf(process.platform === 'linux')('keeps using an opened app-data directory when its path is swapped', async () => {
  const tempDir = await fs.promises.mkdtemp('/tmp/runtipi-app-permissions-');
  const appDataDir = path.join(tempDir, 'evil', 'demo');
  const movedAppDataDir = path.join(tempDir, 'evil', 'demo-before-swap');
  const safeFile = path.join(appDataDir, 'safe.txt');
  const externalDir = path.join(tempDir, 'external');
  const externalFile = path.join(externalDir, 'external.txt');
  const configuration = mock<ConfigurationService>();
  const logger = mock<LoggerService>();
  configuration.getConfig.mockReturnValue(fromPartial({ directories: { appDataDir: tempDir, dataDir: tempDir } }));
  const manager = new AppFilesManager(configuration, new FilesystemService(logger), logger);
  const originalOpenDir = fs.promises.opendir;
  const openDirSpy = vi.spyOn(fs.promises, 'opendir');
  let swapped = false;

  try {
    await fs.promises.mkdir(appDataDir, { recursive: true });
    await fs.promises.mkdir(externalDir);
    await fs.promises.writeFile(safeFile, 'safe', { mode: 0o600 });
    await fs.promises.writeFile(externalFile, 'external', { mode: 0o600 });
    openDirSpy.mockImplementation(async (directory, options) => {
      if (!swapped && String(directory).startsWith('/proc/self/fd/')) {
        swapped = true;
        await fs.promises.rename(appDataDir, movedAppDataDir);
        await fs.promises.symlink(externalDir, appDataDir);
      }
      return originalOpenDir(directory, options);
    });

    await manager.setAppDataDirPermissions('demo:evil' as AppUrn);

    expect(swapped).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
    expect((await fs.promises.stat(path.join(movedAppDataDir, 'safe.txt'))).mode & 0o777).toBe(0o777);
    expect((await fs.promises.stat(externalFile)).mode & 0o777).toBe(0o600);
  } finally {
    openDirSpy.mockRestore();
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});
