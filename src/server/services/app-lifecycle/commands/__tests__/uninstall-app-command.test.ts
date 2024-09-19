import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { type TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppDataService, AppFileAccessor } from '@runtipi/shared/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { UninstallAppCommand } from '../uninstall-app-command';
import { CacheMock } from 'packages/cache/src/mock';
import { LoggerMock } from 'packages/shared/src/node/logger/LoggerMock';

let db: TestDatabase;
const TEST_SUITE = 'uninstallappcommand';
const logger = new LoggerMock();
const cache = new CacheMock();

const dispatcher = new EventDispatcher(logger, cache);
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id', logger });
const appFileAccessor = new AppFileAccessor({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id', logger });
let uninstallApp: UninstallAppCommand;

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  uninstallApp = new UninstallAppCommand({
    queries: new AppQueries(db.dbClient),
    eventDispatcher: dispatcher,
    executeOtherCommand: vi.fn(),
    appDataService,
    appFileAccessor,
  });
});

beforeEach(async () => {
  await clearDatabase(db);
  dispatcher.dispatchEventAsync = vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    return { success: true };
  });
});

afterAll(async () => {
  await closeDatabase(db);
  await dispatcher.close();
});

describe('Uninstall app', () => {
  it('should delete app from database', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', env_variable: 'TEST_FIELD', required: true }] });
    await insertApp({}, appConfig, db);

    // act
    await uninstallApp.execute({ appId: appConfig.id });

    // assert
    const dbApp = await getAppById(appConfig.id, db);
    expect(dbApp?.status).toBe('uninstalling');

    await waitForExpect(async () => {
      const dbApp = await getAppById(appConfig.id, db);
      expect(dbApp).toBeNull();
    });
  });

  it('should throw if app is not installed', async () => {
    // act & assert
    await expect(uninstallApp.execute({ appId: 'any' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('should be of status "stopped" if event dispatcher fails', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', env_variable: 'TEST_FIELD', required: true }] });
    await insertApp({}, appConfig, db);
    dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: false });

    // act
    await uninstallApp.execute({ appId: appConfig.id });

    // assert
    await waitForExpect(async () => {
      const dbApp = await getAppById(appConfig.id, db);
      expect(dbApp?.status).toBe('stopped');
    });
  });
});
