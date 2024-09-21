import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { type TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppDataService, AppFileAccessor } from '@runtipi/shared/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { EventDispatcher } from '../../core/EventDispatcher';
import { TipiConfig } from '../../core/TipiConfig';
import { createAppConfig, getAppById, insertApp } from '../../tests/apps.factory';
import { type IAppLifecycleService, AppLifecycleService } from './app-lifecycle.service';
import { CacheMock } from 'packages/cache/src/mock';
import { LoggerMock } from 'packages/shared/src/node/logger/LoggerMock';

let db: TestDatabase;
let appLifecycle: IAppLifecycleService;
const TEST_SUITE = 'applifecycle';

const logger = new LoggerMock();
const cache = new CacheMock();

const dispatcher = new EventDispatcher(logger, cache);
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id', logger });
const appFileAccessor = new AppFileAccessor({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id', logger });

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  appLifecycle = new AppLifecycleService(new AppQueries(db.dbClient), dispatcher, appDataService, appFileAccessor);
});

beforeEach(async () => {
  await clearDatabase(db);
  await TipiConfig.setConfig('version', 'test');
  dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: true });
});

afterAll(async () => {
  await closeDatabase(db);
  await dispatcher.close();
});

describe('App lifecycle', () => {
  it('should be able to execute a command', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act
    await appLifecycle.executeCommand('startApp', { appId: appConfig.id });

    // assert
    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('running');
    });
  });
});
