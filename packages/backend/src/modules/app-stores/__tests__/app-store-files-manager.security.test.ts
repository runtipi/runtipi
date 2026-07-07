import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import type { ConfigurationService } from '@/core/config/configuration.service';
import type { AppStore } from '@/core/database/drizzle/types';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@runtipi/common/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStoreFilesManager } from '../app-store-files-manager';

const directories = {
  appDataDir: APP_DATA_DIR,
  appDir: APP_DIR,
  dataDir: DATA_DIR,
};

const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content);
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

describe('AppStoreFilesManager file security', () => {
  let manager: AppStoreFilesManager;

  beforeEach(async () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerService;

    const configuration = {
      get: vi.fn().mockReturnValue(directories),
      getConfig: vi.fn().mockReturnValue({ directories }),
    } as unknown as ConfigurationService;

    manager = new AppStoreFilesManager(configuration, new FilesystemService(logger), logger, { slug: 'evil' } as AppStore);

    await writeFile(path.join(APP_DIR, 'assets', 'default-app-logo.jpg'), 'default-logo');
  });

  it('does not serve a repository logo symlink target', async () => {
    const logoPath = path.join(DATA_DIR, 'repos', 'evil', 'apps', 'demo', 'metadata', 'logo.jpg');
    await fs.promises.mkdir(path.dirname(logoPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), logoPath);

    const { image } = await manager.getAppImage('demo:evil' as AppUrn);

    expect(image?.toString()).toBe('default-logo');
    expect(image?.toString()).not.toContain('ROOT_FOLDER_HOST');
  });

  it('does not serve an installed logo symlink target', async () => {
    const installedLogoPath = path.join(DATA_DIR, 'apps', 'evil', 'demo', 'metadata', 'logo.jpg');
    const repoLogoPath = path.join(DATA_DIR, 'repos', 'evil', 'apps', 'demo', 'metadata', 'logo.jpg');

    await fs.promises.mkdir(path.dirname(installedLogoPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), installedLogoPath);
    await writeFile(repoLogoPath, 'repo-logo');

    const { image } = await manager.getAppImage('demo:evil' as AppUrn);

    expect(image?.toString()).toBe('repo-logo');
    expect(image?.toString()).not.toContain('ROOT_FOLDER_HOST');
  });

  it('still serves regular repository logo files', async () => {
    await writeFile(path.join(DATA_DIR, 'repos', 'evil', 'apps', 'demo', 'metadata', 'logo.jpg'), 'repo-logo');

    const { image } = await manager.getAppImage('demo:evil' as AppUrn);

    expect(image?.toString()).toBe('repo-logo');
  });

  it('does not expose repository description symlink targets in app info', async () => {
    await writeFile(path.join(DATA_DIR, 'repos', 'evil', 'apps', 'demo', 'config.json'), JSON.stringify(validAppConfig));

    const descriptionPath = path.join(DATA_DIR, 'repos', 'evil', 'apps', 'demo', 'metadata', 'description.md');
    await fs.promises.mkdir(path.dirname(descriptionPath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, '.env'), descriptionPath);

    const appInfo = await manager.getAppInfoFromAppStore('demo:evil' as AppUrn);

    expect(appInfo?.description).toBe('');
  });

  it('does not read repository compose symlink targets', async () => {
    await writeFile(
      path.join(DATA_DIR, 'outside-compose.yml'),
      ['services:', '  leak:', '    image: alpine', 'x-runtipi:', '  schema_version: 1'].join('\n'),
    );

    const composePath = path.join(DATA_DIR, 'repos', 'evil', 'apps', 'demo', 'docker-compose.yml');
    await fs.promises.mkdir(path.dirname(composePath), { recursive: true });
    await fs.promises.symlink(path.join(DATA_DIR, 'outside-compose.yml'), composePath);

    const { content } = await manager.getSourceDockerComposeYaml('demo:evil' as AppUrn);

    expect(JSON.stringify(content)).not.toContain('leak');
  });
});
