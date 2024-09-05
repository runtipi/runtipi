import path from 'node:path';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TipiConfig } from '@/server/core/TipiConfig';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { createAppConfig, getAppById, insertApp } from '@/server/tests/apps.factory';
import { type TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { faker } from '@faker-js/faker';
import { AppDataService } from '@runtipi/shared/node';
import fs from 'fs-extra';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import waitForExpect from 'wait-for-expect';
import { InstallAppCommand } from '../install-app-command';
import { CacheMock } from 'packages/cache/src/mock';
import { LoggerMock } from 'packages/shared/src/node/logger/LoggerMock';

let db: TestDatabase;
const TEST_SUITE = 'installappcommand';
const logger = new LoggerMock();
const cache = new CacheMock();
const dispatcher = new EventDispatcher(logger, cache);
const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: 'repo-id' }, logger);
const executeOtherCommandMock = vi.fn(() => Promise.resolve({ success: true }));
let installApp: InstallAppCommand;

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  installApp = new InstallAppCommand({
    queries: new AppQueries(db.dbClient),
    eventDispatcher: dispatcher,
    executeOtherCommand: executeOtherCommandMock,
    appDataService,
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

describe('Install app', () => {
  it('should add app in database', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', env_variable: 'TEST_FIELD', required: true }] });
    await installApp.execute({ appId: appConfig.id, form: { TEST_FIELD: 'test' } });

    // act
    const dbApp = await getAppById(appConfig.id, db);

    // assert
    expect(dbApp).toBeDefined();
    expect(dbApp?.id).toBe(appConfig.id);
    expect(dbApp?.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(dbApp?.status).toBe('installing');

    await waitForExpect(async () => {
      const dbApp = await getAppById(appConfig.id, db);
      expect(dbApp?.status).toBe('running');
    });
  });

  it('should delete app from database if event dispatcher fails', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', env_variable: 'TEST_FIELD', required: true }] });
    dispatcher.dispatchEventAsync = vi.fn().mockResolvedValue({ success: false });

    // act
    await installApp.execute({ appId: appConfig.id, form: { TEST_FIELD: 'test' } });

    // assert
    await waitForExpect(async () => {
      const dbApp = await getAppById(appConfig.id, db);
      expect(dbApp).toBeNull();
    });
  });

  it('should start app if it is already installed', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', env_variable: 'TEST_FIELD', required: true }] });
    await insertApp({ id: appConfig.id, status: 'stopped' }, appConfig, db);

    // act
    await installApp.execute({ appId: appConfig.id, form: { TEST_FIELD: 'test' } });

    // assert
    await waitForExpect(async () => {
      expect(executeOtherCommandMock).toHaveBeenCalledWith('startApp', { appId: appConfig.id });
    });
  });

  it('should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: { exposed: true } })).rejects.toThrow('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
  });

  it('should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
      'APP_ERROR_APP_NOT_EXPOSABLE',
    );
  });

  it('should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: { exposed: true, domain: 'test' } })).rejects.toThrow('APP_ERROR_DOMAIN_NOT_VALID');
  });

  it('should throw if app is exposed and domain is already used by another exposed app', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig2, db);

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: { exposed: true, domain } })).rejects.toThrow('APP_ERROR_DOMAIN_ALREADY_IN_USE');
  });

  it('should throw if architecure is not supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'amd64');
    const appConfig = createAppConfig({ supported_architectures: ['arm64'] });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).rejects.toThrow('APP_ERROR_ARCHITECTURE_NOT_SUPPORTED');
  });

  it('can install if architecture is supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    const appConfig = createAppConfig({ supported_architectures: ['arm64'] });

    // act
    await installApp.execute({ appId: appConfig.id, form: {} });
    const app = await getAppById(appConfig.id, db);

    expect(app).toBeDefined();
  });

  it('can install if no architecture is specified', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    const appConfig = createAppConfig({ supported_architectures: undefined });

    // act
    await installApp.execute({ appId: appConfig.id, form: {} });
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app).toBeDefined();
  });

  it('should throw if config.json is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({});
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'test');

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: { domain: faker.internet.domainName() } })).rejects.toThrow(
      'APP_ERROR_APP_FORCE_EXPOSED',
    );
  });

  it('should throw if app has no domain and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: { exposed: true } })).rejects.toThrow('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
  });

  it('should throw if the current tipi version is lower than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.1.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).resolves.not.toThrow();
  });

  it('should not throw if the current tipi version is higher than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).resolves.not.toThrow();
  });

  it('should throw if the version format is invalid', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: 'invalid' });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).rejects.toThrow();
  });

  it('should work with a version including a v prefix', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: 'v3.2.0' });

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).resolves.not.toThrow();
  });

  it('should throw if demo mode is enabled and the app limit is reached', async () => {
    // arrange
    await TipiConfig.setConfig('demoMode', true);
    const appConfig = createAppConfig();
    await Promise.all(new Array(6).fill(0).map(async () => insertApp({}, createAppConfig(), db)));

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).rejects.toThrow('SYSTEM_ERROR_DEMO_MODE_LIMIT');
  });

  it('should throw if the app config is invalid', async () => {
    // arrange
    const appConfig = createAppConfig();
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'test');

    // act & assert
    await expect(installApp.execute({ appId: appConfig.id, form: {} })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});
