import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ResetAppCommand } from '../reset-app-command';

let db: TestDatabase;
const TEST_SUITE = 'resetappcommand';
const dispatcher = new EventDispatcher();
let startApp: ResetAppCommand;

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  startApp = new ResetAppCommand({ queries: new AppQueries(db.db), eventDispatcher: dispatcher });
});

beforeEach(async () => {
  await clearDatabase(db);
  dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: true });
});

afterAll(async () => {
  await closeDatabase(db);
  await dispatcher.close();
});

describe('Reset app', () => {
  it("Should throw if app doesn't exist", async () => {
    await expect(startApp.execute({ appId: 'test-app2' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('should reset app', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', required: true, env_variable: 'TEST_FIELD' }] });
    await insertApp({ status: 'running' }, appConfig, db);

    // act
    await startApp.execute({ appId: appConfig.id });

    // assert
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('resetting');

    await waitForExpect(async () => {
      const app = await getAppById(appConfig.id, db);
      expect(app?.status).toBe('running');
    });
  });

  it('should put status to stopped if reset event fails', async () => {
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
});
