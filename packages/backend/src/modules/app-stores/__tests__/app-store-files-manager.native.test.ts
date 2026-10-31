import fs from 'node:fs';
import path from 'node:path';
import type { ConfigurationService } from '@/core/config/configuration.service';
import type { AppStore } from '@/core/database/drizzle/types';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, onTestFinished, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppStoreFilesManager } from '../app-store-files-manager';

vi.unmock('fs');
vi.unmock('node:fs');

const setup = async () => {
  const temporaryDirectory = await fs.promises.mkdtemp('/tmp/runtipi-app-store-');
  onTestFinished(() => fs.promises.rm(temporaryDirectory, { recursive: true, force: true }));

  const directories = {
    appDataDir: path.join(temporaryDirectory, 'app-data'),
    appDir: path.join(temporaryDirectory, 'app'),
    dataDir: temporaryDirectory,
  };
  const configuration = mock<ConfigurationService>();
  configuration.getConfig.mockReturnValue(fromPartial({ directories }));

  const logger = mock<LoggerService>();
  const filesystem = new FilesystemService(logger);
  const storeFiles = new AppStoreFilesManager(configuration, filesystem, logger, fromPartial<AppStore>({ slug: 'test' }));
  const appFiles = new AppFilesManager(configuration, filesystem, logger);
  const appUrn = 'demo:test' as AppUrn;
  const paths = storeFiles.getAppPaths(appUrn);
  await fs.promises.mkdir(paths.appRepoDir, { recursive: true });

  return { temporaryDirectory, storeFiles, appFiles, appUrn, ...paths };
};

test.each(['file', 'directory', 'symlink', 'dangling symlink'])('skips a reserved %s and preserves other symlinks', async (entry) => {
  const { temporaryDirectory, storeFiles, appFiles, appUrn, appRepoDir, appInstalledDir } = await setup();
  const externalFile = path.join(temporaryDirectory, 'external-marker');
  const generatedCompose = path.join(appRepoDir, 'docker-compose.generated.yml');
  const target = path.join(temporaryDirectory, 'missing-marker');

  await fs.promises.writeFile(externalFile, 'original');
  await fs.promises.mkdir(path.join(appRepoDir, 'assets'));
  await fs.promises.writeFile(path.join(appRepoDir, 'assets', 'docker-compose.generated.yml'), 'asset');
  await fs.promises.symlink('docker-compose.generated.yml', path.join(appRepoDir, 'assets', 'linked-asset'));

  if (entry === 'file') {
    await fs.promises.writeFile(generatedCompose, 'repository output');
  } else if (entry === 'directory') {
    await fs.promises.mkdir(generatedCompose);
    await fs.promises.writeFile(path.join(generatedCompose, 'ignored'), 'repository output');
  } else if (entry === 'symlink') {
    await fs.promises.symlink(externalFile, generatedCompose);
  } else {
    await fs.promises.symlink(target, generatedCompose);
  }

  await storeFiles.copyAppFromRepoToInstalled(appUrn);

  await expect(fs.promises.lstat(path.join(appInstalledDir, 'docker-compose.generated.yml'))).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(fs.promises.readlink(path.join(appInstalledDir, 'assets', 'linked-asset'))).resolves.toBe('docker-compose.generated.yml');

  await fs.promises.rename(appRepoDir, `${appRepoDir}-moved`);

  await expect(fs.promises.readFile(path.join(appInstalledDir, 'assets', 'linked-asset'), 'utf8')).resolves.toBe('asset');
  await expect(fs.promises.readFile(path.join(appInstalledDir, 'assets', 'docker-compose.generated.yml'), 'utf8')).resolves.toBe('asset');

  await appFiles.writeDockerComposeYml(appUrn, 'services: {}');

  await expect(fs.promises.readFile(externalFile, 'utf8')).resolves.toBe('original');
  await expect(fs.promises.lstat(target)).rejects.toMatchObject({ code: 'ENOENT' });
  expect((await fs.promises.lstat(path.join(appInstalledDir, 'docker-compose.generated.yml'))).isFile()).toBe(true);
  await expect(fs.promises.readFile(path.join(appInstalledDir, 'docker-compose.generated.yml'), 'utf8')).resolves.toBe('services: {}\n');
});
