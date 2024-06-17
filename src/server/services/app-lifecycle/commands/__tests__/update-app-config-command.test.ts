import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { faker } from '@faker-js/faker';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { UpdateAppConfigCommand } from '../update-app-config-command';
import path from 'path';
import { DATA_DIR } from '@/config/constants';
import { AppDataService } from '@runtipi/shared/node';

let db: TestDatabase;
const TEST_SUITE = 'updateappconfigcommand';
const dispatcher = new EventDispatcher();
const appDataService = new AppDataService(DATA_DIR, 'repo-id');
let updateAppConfig: UpdateAppConfigCommand;
const executeOtherCommandMock = vi.fn(() => Promise.resolve({ success: true }));

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  updateAppConfig = new UpdateAppConfigCommand({
    queries: new AppQueries(db.db),
    eventDispatcher: dispatcher,
    executeOtherCommand: executeOtherCommandMock,
    appDataService,
  });
});

beforeEach(async () => {
  await clearDatabase(db);
  dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: true });
});

afterAll(async () => {
  await closeDatabase(db);
  await dispatcher.close();
});

describe('Update app config', () => {
  it('should correctly update app config', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', required: true, env_variable: 'TEST_FIELD' }] });
    await insertApp({}, appConfig, db);
    const word = faker.lorem.word();

    // act
    await updateAppConfig.execute({ appId: appConfig.id, form: { TEST_FIELD: word } });
    const app = await getAppById(appConfig.id, db);
    const config = castAppConfig(app?.config);

    // assert
    expect(config.TEST_FIELD).toBe(word);
  });

  it('should throw if app is not installed', async () => {
    await expect(updateAppConfig.execute({ appId: 'test-app-2', form: { test: 'test' } })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: { exposed: true } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
    );
  });

  it('should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: { exposed: true, domain: 'test' } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_NOT_VALID',
    );
  });

  it('should throw if app is exposed and domain is already used', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig2.id, form: { exposed: true, domain } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_ALREADY_IN_USE',
    );
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });
    await insertApp({ exposed: true }, appConfig, db);

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: {} })).rejects.toThrow('APP_ERROR_APP_FORCE_EXPOSED');
  });

  it('should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
      'APP_ERROR_APP_NOT_EXPOSABLE',
    );
  });

  it('should throw if app has force_expose set to true and exposed to true and no domain', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: { exposed: true } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
    );
  });

  it('should throw if event dispatcher fails', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);
    dispatcher.dispatchEventAsync = vi.fn().mockResolvedValueOnce({ success: false });

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
      'APP_ERROR_APP_FAILED_TO_UPDATE',
    );
  });

  it('should throw if the app config is invalid', async () => {
    // arrange
    const appConfig = createAppConfig();
    await insertApp({}, appConfig, db);
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'test');
    fs.writeFileSync(path.join(DATA_DIR, 'apps', appConfig.id, 'config.json'), 'invalid json');

    // act & assert
    await expect(updateAppConfig.execute({ appId: appConfig.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow();
  });
});
