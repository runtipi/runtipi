import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@runtipi/common/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppFilesManager } from '../app-files-manager';

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

  beforeEach(() => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerService;

    const configuration = {
      getConfig: vi.fn().mockReturnValue({ directories }),
    } as unknown as ConfigurationService;

    manager = new AppFilesManager(configuration, new FilesystemService(logger), logger);
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

    expect(appEnv.content).toBe('');
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
