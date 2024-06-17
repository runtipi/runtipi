import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { UpdateAppCommand } from '../update-app-command';
import { TipiConfig } from '@/server/core/TipiConfig';
import { AppDataService } from '@runtipi/shared/node';
import { DATA_DIR } from '@/config/constants';

let db: TestDatabase;
const TEST_SUITE = 'updateappcommand';
const dispatcher = new EventDispatcher();
const appDataService = new AppDataService(DATA_DIR, 'repo-id');
let updateApp: UpdateAppCommand;

const executeOtherCommandMock = vi.fn(() => Promise.resolve({ success: true }));

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  updateApp = new UpdateAppCommand({
    queries: new AppQueries(db.db),
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
    await expect(updateApp.execute({ appId: 'test-app2' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('should comme back to the previous status before the update of the app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act & assert
    await updateApp.execute({ appId: appConfig.id });
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
    await expect(updateApp.execute({ appId: appConfig.id })).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act & assert
    await expect(updateApp.execute({ appId: appConfig.id })).resolves.not.toThrow();

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
    await updateApp.execute({ appId: appConfig.id });

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
    await updateApp.execute({ appId: appConfig.id });

    // assert
    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('stopped');
    });
  });
});
