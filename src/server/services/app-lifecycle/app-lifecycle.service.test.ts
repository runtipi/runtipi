import fs from 'fs-extra';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { faker } from '@faker-js/faker';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import path from 'path';
import { DATA_DIR } from '@/config/constants';
import { vi, beforeEach, beforeAll, afterAll, describe, it, expect } from 'vitest';
import { AppLifecycleClass } from './app-lifecycle.service';
import { EventDispatcher } from '../../core/EventDispatcher';
import { getAppById, updateApp, createAppConfig, insertApp } from '../../tests/apps.factory';
import { TipiConfig } from '../../core/TipiConfig';
import { AppQueries } from '@/server/queries/apps/apps.queries';

let db: TestDatabase;
let appLifecycle: AppLifecycleClass;
const TEST_SUITE = 'appsservice';
const dispatcher = new EventDispatcher(TEST_SUITE);

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

describe('Install app', () => {
  it('Should add app in database', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', env_variable: 'TEST_FIELD', required: true }] });
    await appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: { TEST_FIELD: 'test' } });

    // act
    const dbApp = await getAppById(appConfig.id, db);

    // assert
    expect(dbApp).toBeDefined();
    expect(dbApp?.id).toBe(appConfig.id);
    expect(dbApp?.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(dbApp?.status).toBe('running');
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: { exposed: true } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
    );
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
      'APP_ERROR_APP_NOT_EXPOSABLE',
    );
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: { exposed: true, domain: 'test' } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_NOT_VALID',
    );
  });

  it('Should throw if app is exposed and domain is already used by another exposed app', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig2, db);

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: { exposed: true, domain } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_ALREADY_IN_USE',
    );
  });

  it('Should throw if architecure is not supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'amd64');
    const appConfig = createAppConfig({ supported_architectures: ['arm64'] });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).rejects.toThrow(
      `App ${appConfig.id} is not supported on this architecture`,
    );
  });

  it('Can install if architecture is supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm');
    const appConfig = createAppConfig({ supported_architectures: ['arm'] });

    // act
    await appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} });
    const app = await getAppById(appConfig.id, db);

    expect(app).toBeDefined();
  });

  it('Can install if no architecture is specified', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm');
    const appConfig = createAppConfig({ supported_architectures: undefined });

    // act
    await appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} });
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app).toBeDefined();
  });

  it('Should throw if config.json is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({});
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'test');

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).rejects.toThrow(
      `App ${appConfig.id} has invalid config.json file`,
    );
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).rejects.toThrow();
  });

  it('should throw if the current tipi version is lower than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.1.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).resolves.not.toThrow();
  });

  it('should not throw if the current tipi version is higher than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).resolves.not.toThrow();
  });

  it('should throw if the version format is invalid', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: 'invalid' });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).rejects.toThrow();
  });

  it('should work with a version including a v prefix', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: 'v3.2.0' });

    // act & assert
    await expect(appLifecycle.executeCommand('installApp', { appId: appConfig.id, form: {} })).resolves.not.toThrow();
  });
});

describe('Uninstall app', () => {
  it('Should throw if app is not installed', async () => {
    // act & assert
    await expect(appLifecycle.executeCommand('uninstallApp', { appId: 'any' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Start app', () => {
  it('Should throw if app is not installed', async () => {
    await expect(appLifecycle.executeCommand('startApp', { appId: 'any' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Stop app', () => {
  it('Should throw if app is not installed', async () => {
    await expect(appLifecycle.executeCommand('stopApp', { appId: 'any' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Restart app', () => {
  it('Should throw if app is not installed', async () => {
    await expect(appLifecycle.executeCommand('resetApp', { appId: 'any' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Update app config', () => {
  it('Should correctly update app config', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', required: true, env_variable: 'TEST_FIELD' }] });
    await insertApp({}, appConfig, db);
    const word = faker.lorem.word();

    // act
    await appLifecycle.executeCommand('updateAppConfig', { appId: appConfig.id, form: { TEST_FIELD: word } });
    const app = await getAppById(appConfig.id, db);
    const config = castAppConfig(app?.config);

    // assert
    expect(config.TEST_FIELD).toBe(word);
  });

  it('Should throw if app is not installed', async () => {
    await expect(appLifecycle.executeCommand('updateAppConfig', { appId: 'test-app-2', form: { test: 'test' } })).rejects.toThrow(
      'APP_ERROR_APP_NOT_FOUND',
    );
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(appLifecycle.executeCommand('updateAppConfig', { appId: appConfig.id, form: { exposed: true } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
    );
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(appLifecycle.executeCommand('updateAppConfig', { appId: appConfig.id, form: { exposed: true, domain: 'test' } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_NOT_VALID',
    );
  });

  it('Should throw if app is exposed and domain is already used', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act & assert
    await expect(appLifecycle.executeCommand('updateAppConfig', { appId: appConfig2.id, form: { exposed: true, domain } })).rejects.toThrow(
      'APP_ERROR_DOMAIN_ALREADY_IN_USE',
    );
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });
    await insertApp({ exposed: true }, appConfig, db);

    // act & assert
    await expect(appLifecycle.executeCommand('updateAppConfig', { appId: appConfig.id, form: {} })).rejects.toThrow('APP_ERROR_APP_FORCE_EXPOSED');
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(
      appLifecycle.executeCommand('updateAppConfig', { appId: appConfig.id, form: { exposed: true, domain: 'test.com' } }),
    ).rejects.toThrow('APP_ERROR_APP_NOT_EXPOSABLE');
  });
});

describe('Update app', () => {
  it("Should throw if app doesn't exist", async () => {
    await expect(appLifecycle.executeCommand('updateApp', { appId: 'test-app2' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('Should comme back to the previous status before the update of the app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act & assert
    await updateApp(appConfig.id, { version: 0 }, db);
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('stopped');
  });

  it('should throw if the current tipi version is lower than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.1.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });
    await insertApp({ status: 'running' }, appConfig, db);

    // act & assert
    await expect(appLifecycle.executeCommand('updateApp', { appId: appConfig.id })).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it.skip('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });
    await insertApp({ status: 'running' }, appConfig, db);

    // act & assert
    await expect(appLifecycle.executeCommand('updateApp', { appId: appConfig.id })).resolves.not.toThrow();
  });
});
