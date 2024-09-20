import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import * as dockerHelpers from '@/lib/docker';
import { getEnv } from '@/lib/environment';
import { createAppConfig } from '@/tests/apps.factory';
import { faker } from '@faker-js/faker';
import * as sharedNode from '@runtipi/shared/node';
import { describe, expect, it, vi } from 'vitest';
import { AppExecutors } from '../app.executors';
import { mock } from 'vitest-mock-extended';
import type { IDbClient } from '@runtipi/db';
import type { ISocketManager } from '@/lib/socket/SocketManager';
import { AppFileAccessor, type IBackupManager, type Logger } from '@runtipi/shared/node';

const { pathExists } = sharedNode;

const { appsRepoId } = getEnv();

describe('test: app executors', () => {
  // Prepare the mocks
  const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() } as unknown as Logger;
  const mockDbClient = mock<IDbClient>();
  const mockSocketManager = mock<ISocketManager>();
  const mockBackupManager = mock<IBackupManager>();
  const appFileAccessor = new AppFileAccessor({ logger: mockLogger, dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id' });

  const appExecutors = new AppExecutors(mockLogger, mockDbClient, mockSocketManager, appFileAccessor, mockBackupManager);

  describe('test: installApp()', () => {
    it('should run correct compose script', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose').mockImplementation(() => Promise.resolve({ stdout: 'done', stderr: '' }));
      const config = createAppConfig({}, false);

      // act
      const { message, success } = await appExecutors.installApp(config.id, config);

      // assert
      const envExists = await pathExists(path.join(APP_DATA_DIR, config.id, 'app.env'));

      expect(success).toBe(true);
      expect(message).toBe(`App ${config.id} installed successfully`);
      expect(spy).toHaveBeenCalledWith(config.id, 'up --detach --force-recreate --remove-orphans --pull always');
      expect(envExists).toBe(true);
      spy.mockRestore();
    });

    it('should return error if compose script fails', async () => {
      // arrange
      const randomError = faker.system.fileName();
      const spy = vi.spyOn(dockerHelpers, 'compose').mockImplementation(() => {
        throw new Error(randomError);
      });
      const config = createAppConfig({}, false);

      // act
      const { message, success } = await appExecutors.installApp(config.id, config);

      // assert
      expect(success).toBe(false);
      expect(message).toContain(randomError);
      spy.mockRestore();
    });

    it('should delete existing app folder', async () => {
      // arrange
      const config = createAppConfig();
      await fs.promises.mkdir(path.join(DATA_DIR, 'apps', config.id), { recursive: true });
      await fs.promises.writeFile(path.join(DATA_DIR, 'apps', config.id, 'test.txt'), 'test');

      // act
      await appExecutors.installApp(config.id, config);

      // assert
      const exists = await pathExists(path.join(DATA_DIR, 'apps', config.id, 'test.txt'));

      expect(exists).toBe(false);
    });

    it('should not delete existing app-data folder', async () => {
      // arrange
      const config = createAppConfig();
      const filename = faker.system.fileName();
      await fs.promises.writeFile(path.join(APP_DATA_DIR, config.id, filename), 'test');

      // act
      await appExecutors.installApp(config.id, config);

      // assert
      const exists = await pathExists(path.join(APP_DATA_DIR, config.id, filename));

      expect(exists).toBe(true);
    });

    it('should copy data folder from repo to app-data/id/data', async () => {
      // arrange
      const config = createAppConfig({}, false);
      const filename = faker.system.fileName();
      await fs.promises.mkdir(path.join(DATA_DIR, 'repos', appsRepoId, 'apps', config.id, 'data'), {
        recursive: true,
      });
      await fs.promises.writeFile(path.join(DATA_DIR, 'repos', appsRepoId, 'apps', config.id, 'data', filename), 'test');

      // act
      await appExecutors.installApp(config.id, config);

      // assert
      const exists = await pathExists(path.join(APP_DATA_DIR, config.id, 'data', filename));
      const data = await fs.promises.readFile(path.join(APP_DATA_DIR, config.id, 'data', filename), 'utf-8');

      expect(exists).toBe(true);
      expect(data).toBe('test');
    });

    it('should not overwrite exisiting app-data/id/data folder if repo has one', async () => {
      // arrange
      const config = createAppConfig();
      const filename = faker.system.fileName();
      await fs.promises.writeFile(path.join(APP_DATA_DIR, config.id, 'data', filename), 'test');
      await fs.promises.mkdir(path.join(DATA_DIR, 'repos', appsRepoId, 'apps', config.id, 'data'), {
        recursive: true,
      });
      await fs.promises.writeFile(path.join(DATA_DIR, 'repos', appsRepoId, 'apps', config.id, 'data', filename), 'yeah');

      // act
      await appExecutors.installApp(config.id, config);

      // assert
      const exists = await pathExists(path.join(APP_DATA_DIR, config.id, 'data', filename));
      const data = await fs.promises.readFile(path.join(APP_DATA_DIR, config.id, 'data', filename), 'utf-8');

      expect(exists).toBe(true);
      expect(data).toBe('test');
    });

    it('should handle errors gracefully', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose').mockImplementation(() => Promise.reject(new Error('test')));
      const config = createAppConfig();

      // act
      const { message, success } = await appExecutors.installApp(config.id, config);

      // assert
      expect(success).toBe(false);
      expect(message).toBe('test');
      spy.mockRestore();
    });

    it('should error if app does not exist', async () => {
      // act
      const { message, success } = await appExecutors.installApp('inexistant', {});

      // assert
      expect(success).toBe(false);
      expect(message).toBe(`App inexistant not found in repo ${appsRepoId}`);
    });
  });

  describe('test: stopApp()', () => {
    it('should handle errors gracefully', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose').mockImplementation(() => Promise.reject(new Error('test')));
      const config = createAppConfig();

      // act
      const { message, success } = await appExecutors.stopApp(config.id, {}, true);

      // assert
      expect(success).toBe(false);
      expect(message).toBe('test');
      spy.mockRestore();
    });
  });

  describe('test: restartApp()', () => {
    it('should start and stop the app', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose').mockImplementation(() => Promise.resolve({ stdout: 'done', stderr: '' }));
      const config = createAppConfig();

      // act
      const { message, success } = await appExecutors.restartApp(config.id, {}, true);

      // assert
      expect(success).toBe(true);
      expect(message).toBe(`App ${config.id} restarted successfully`);
      expect(spy).toHaveBeenCalledWith(config.id, 'up --detach --force-recreate --remove-orphans --pull always');
      expect(spy).toHaveBeenCalledWith(config.id, 'rm --force --stop');
      spy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose').mockImplementation(() => Promise.reject(new Error('test')));
      const config = createAppConfig();

      // act
      const { message, success } = await appExecutors.restartApp(config.id, {}, true);

      // assert
      expect(success).toBe(false);
      expect(message).toBe('test');
      spy.mockRestore();
    });
  });

  describe('test: updateApp()', () => {
    it('should still update even if current compose file is broken', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose');
      const config = createAppConfig();

      spy.mockResolvedValueOnce({ stdout: 'done', stderr: '' });
      spy.mockImplementationOnce(() => {
        throw new Error('test');
      });
      spy.mockResolvedValue({ stdout: 'done', stderr: '' });

      // act
      const { message, success } = await appExecutors.updateApp(config.id, config, false);

      // assert
      expect(success).toBe(true);
      expect(message).toBe(`App ${config.id} updated successfully`);
      spy.mockRestore();
    });

    it('should replace app directory with new one', async () => {
      // arrange
      const spy = vi.spyOn(dockerHelpers, 'compose');
      spy.mockResolvedValue({ stdout: 'done', stderr: '' });

      const config = createAppConfig();
      const oldFolder = path.join(DATA_DIR, 'apps', config.id);

      await fs.promises.writeFile(path.join(oldFolder, 'docker-compose.yml'), 'test');

      // act
      await appExecutors.updateApp(config.id, config, false);

      // assert
      const exists = await pathExists(oldFolder);
      const content = await fs.promises.readFile(path.join(oldFolder, 'docker-compose.yml'), 'utf-8');

      expect(exists).toBe(true);
      expect(content).not.toBe('test');
      spy.mockRestore();
    });
  });
});
