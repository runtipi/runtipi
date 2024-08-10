import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TipiConfig } from '@/server/core/TipiConfig';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { type TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppDataService } from '@runtipi/shared/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { UpdateAppCommand } from '../update-app-command';

let db: TestDatabase;
const TEST_SUITE = 'updateappcommand';
const dispatcher = new EventDispatcher();
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id' });
let updateApp: UpdateAppCommand;

const executeOtherCommandMock = vi.fn(() => Promise.resolve({ success: true }));

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  updateApp = new UpdateAppCommand({
    queries: new AppQueries(db.dbClient),
    eventDispatcher: dispatcher,
    executeOtherCommand: executeOtherCommandMock,
    appDataService,
  });
});

beforeEach(async () => {
  await clearDatabase(db);
  dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: true });
  executeOtherCommandMock.mockRestore();
});

afterAll(async () => {
  await closeDatabase(db);
  await dispatcher.close();
});

describe('Update app', () => {
  it("should throw if app doesn't exist", async () => {
    await expect(updateApp.execute({ appId: 'test-app2', performBackup: false })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('should comme back to the previous status before the update of the app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act & assert
    await updateApp.execute({ appId: appConfig.id, performBackup: false });
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('updating');

    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('stopped');
    });
  });

  it('should throw if the current tipi version is lower than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.1.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act & assert
    await expect(updateApp.execute({ appId: appConfig.id, performBackup: false })).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act & assert
    await expect(updateApp.execute({ appId: appConfig.id, performBackup: false })).resolves.not.toThrow();

    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('stopped');
    });
  });

  it('should start app if it was running before the update', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);

    // act
    await updateApp.execute({ appId: appConfig.id, performBackup: false });

    // assert
    await waitForExpect(async () => {
      expect(executeOtherCommandMock).toHaveBeenCalledWith('startApp', { appId: appConfig.id });
    });
  });

  it('should put app in stopped status if the update fails', async () => {
    // arrange
    dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: false });
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act
    await updateApp.execute({ appId: appConfig.id, performBackup: false });

    // assert
    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('stopped');
    });
  });
});
