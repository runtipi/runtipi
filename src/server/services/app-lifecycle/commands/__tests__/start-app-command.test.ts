import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { StartAppCommand } from '../start-app-command';
import { AppDataService } from '@runtipi/shared/node';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';

let db: TestDatabase;
const TEST_SUITE = 'startappcommand';
const dispatcher = new EventDispatcher();
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id' });
let startApp: StartAppCommand;

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  startApp = new StartAppCommand({ queries: new AppQueries(db.db), eventDispatcher: dispatcher, executeOtherCommand: vi.fn(), appDataService });
});

beforeEach(async () => {
  await clearDatabase(db);
  dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: true });
});

afterAll(async () => {
  await closeDatabase(db);
  await dispatcher.close();
});

describe('Start app', () => {
  it('should start app', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', required: true, env_variable: 'TEST_FIELD' }] });
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act
    await startApp.execute({ appId: appConfig.id });

    // assert
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('starting');

    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('running');
    });
  });

  it('should put status to stopped if start event fails', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', required: true, env_variable: 'TEST_FIELD' }] });
    await insertApp({ status: 'updating' }, appConfig, db);
    dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: false });

    // act
    await startApp.execute({ appId: appConfig.id });

    // assert
    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('stopped');
    });
  });

  it('should throw if app is not installed', async () => {
    await expect(startApp.execute({ appId: 'any' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});
