import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { vi, beforeEach, beforeAll, afterAll, describe, it, expect } from 'vitest';
import { AppLifecycleClass } from './app-lifecycle.service';
import { EventDispatcher } from '../../core/EventDispatcher';
import { getAppById, createAppConfig, insertApp } from '../../tests/apps.factory';
import { TipiConfig } from '../../core/TipiConfig';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import waitForExpect from 'wait-for-expect';

let db: TestDatabase;
let appLifecycle: AppLifecycleClass;
const TEST_SUITE = 'applifecycle';
const dispatcher = new EventDispatcher();

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  appLifecycle = new AppLifecycleClass(new AppQueries(db.db), dispatcher);
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
