import fs from 'fs-extra';
import waitForExpect from 'wait-for-expect';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { faker } from '@faker-js/faker';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import path from 'path';
import { DATA_DIR } from '@/config/constants';
import { vi, beforeEach, beforeAll, afterAll, describe, it, expect } from 'vitest';
import { AppServiceClass } from './apps.service';
import { EventDispatcher } from '../../core/EventDispatcher';
import { getAllApps, getAppById, updateApp, createAppConfig, insertApp } from '../../tests/apps.factory';
import { TipiConfig } from '../../core/TipiConfig';

let db: TestDatabase;
let AppsService: AppServiceClass;
const TEST_SUITE = 'appsservice';
const dispatcher = new EventDispatcher(TEST_SUITE);

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
  AppsService = new AppServiceClass(db.db);
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
    await AppsService.installApp(appConfig.id, { TEST_FIELD: 'test' });

    // act
    const dbApp = await getAppById(appConfig.id, db);

    // assert
    expect(dbApp).toBeDefined();
    expect(dbApp?.id).toBe(appConfig.id);
    expect(dbApp?.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(dbApp?.status).toBe('installing');
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true })).rejects.toThrow('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true, domain: 'test.com' })).rejects.toThrow('APP_ERROR_APP_NOT_EXPOSABLE');
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true, domain: 'test' })).rejects.toThrow('APP_ERROR_DOMAIN_NOT_VALID');
  });

  it('Should throw if app is exposed and domain is already used by another exposed app', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig2, db);

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true, domain })).rejects.toThrow('APP_ERROR_DOMAIN_ALREADY_IN_USE');
  });

  it('Should throw if architecure is not supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'amd64');
    const appConfig = createAppConfig({ supported_architectures: ['arm64'] });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrow(`App ${appConfig.id} is not supported on this architecture`);
  });

  it('Can install if architecture is supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm');
    const appConfig = createAppConfig({ supported_architectures: ['arm'] });

    // act
    await AppsService.installApp(appConfig.id, {});
    const app = await getAppById(appConfig.id, db);

    expect(app).toBeDefined();
  });

  it('Can install if no architecture is specified', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm');
    const appConfig = createAppConfig({ supported_architectures: undefined });

    // act
    await AppsService.installApp(appConfig.id, {});
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app).toBeDefined();
  });

  it('Should throw if config.json is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({});
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'test');

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrow(`App ${appConfig.id} has invalid config.json file`);
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrow();
  });

  it('should throw if the current tipi version is lower than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.1.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).resolves.not.toThrow();
  });

  it('should not throw if the current tipi version is higher than min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).resolves.not.toThrow();
  });

  it('should throw if the version format is invalid', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: 'invalid' });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrow();
  });

  it('should work with a version including a v prefix', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.3.0');
    const appConfig = createAppConfig({ min_tipi_version: 'v3.2.0' });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).resolves.not.toThrow();
  });
});

describe('Uninstall app', () => {
  it('Should throw if app is not installed', async () => {
    // act & assert
    await expect(AppsService.uninstallApp('any')).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Start app', () => {
  it('Should throw if app is not installed', async () => {
    await expect(AppsService.startApp('any')).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Stop app', () => {
  it('Should throw if app is not installed', async () => {
    await expect(AppsService.stopApp('any')).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Restart app', () => {
  it('Should throw if app is not installed', async () => {
    await expect(AppsService.restartApp('any')).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });
});

describe('Update app config', () => {
  it('Should correctly update app config', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ type: 'text', label: '', required: true, env_variable: 'TEST_FIELD' }] });
    await insertApp({}, appConfig, db);
    const word = faker.lorem.word();

    // act
    await AppsService.updateAppConfig(appConfig.id, { TEST_FIELD: word });
    const app = await getAppById(appConfig.id, db);
    const config = castAppConfig(app?.config);

    // assert
    expect(config.TEST_FIELD).toBe(word);
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.updateAppConfig('test-app-2', { test: 'test' })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig.id, { exposed: true })).rejects.toThrow('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig.id, { exposed: true, domain: 'test' })).rejects.toThrow('APP_ERROR_DOMAIN_NOT_VALID');
  });

  it('Should throw if app is exposed and domain is already used', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig2.id, { exposed: true, domain })).rejects.toThrow('APP_ERROR_DOMAIN_ALREADY_IN_USE');
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });
    await insertApp({ exposed: true }, appConfig, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig.id, {})).rejects.toThrow('APP_ERROR_APP_FORCE_EXPOSED');
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig.id, { exposed: true, domain: 'test.com' })).rejects.toThrow('APP_ERROR_APP_NOT_EXPOSABLE');
  });
});

describe('Get app config', () => {
  it('Should correctly get app config', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ config: { TEST_FIELD: 'test' } }, appConfig, db);

    // act
    const app = await AppsService.getApp(appConfig.id);

    // assert
    expect(app).toBeDefined();
    expect(app.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app.id).toBe(appConfig.id);
    expect(app.status).toBe('running');
  });

  it('Should return default values if app is not installed', async () => {
    // arrange
    const appConfig = createAppConfig({});

    // act
    const app = await AppsService.getApp(appConfig.id);

    // assert
    expect(app).toBeDefined();
    expect(app.id).toBe(appConfig.id);
    expect(app.config).toStrictEqual({});
    expect(app.status).toBe('missing');
  });
});

describe('List apps', () => {
  it.skip('Should correctly list apps sorted by id', async () => {
    // arrange
    const randomName1 = faker.lorem.word();
    const randomName2 = faker.lorem.word();
    const sortedNames = [randomName1, randomName2].sort((a, b) => a.localeCompare(b));

    const appConfig = createAppConfig({ id: randomName1.toLowerCase(), name: randomName1 });
    const appConfig2 = createAppConfig({ id: randomName2.toLowerCase(), name: randomName2 });
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act
    const { apps } = await AppsService.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(2);
    expect(apps[0]?.name).toBe(sortedNames[0]);
    expect(apps[1]?.name).toBe(sortedNames[1]);
  });

  it('Should not list apps that have supportedArchitectures and are not supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    createAppConfig({ supported_architectures: ['amd64'] });

    // act
    const { apps } = await AppsService.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(0);
  });

  it.skip('Should list apps that have supportedArchitectures and are supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm');
    createAppConfig({ supported_architectures: ['arm'] });

    // act
    const { apps } = await AppsService.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it.skip('Should list apps that have no supportedArchitectures specified', async () => {
    // Arrange
    await TipiConfig.setConfig('architecture', 'arm');
    createAppConfig({ supported_architectures: undefined });

    // act
    const { apps } = await AppsService.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it.skip('Should not list app with invalid config.json', async () => {
    // arrange
    const appInfo = createAppConfig({});
    createAppConfig({});
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appInfo.id, 'config.json'), 'invalid json');

    // act
    const { apps } = await AppsService.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });
});

describe('Update app', () => {
  it("Should throw if app doesn't exist", async () => {
    await expect(AppsService.updateApp('test-app2')).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
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
    await expect(AppsService.updateApp(appConfig.id)).rejects.toThrow('APP_UPDATE_ERROR_MIN_TIPI_VERSION');
  });

  it.skip('should not throw if the current tipi version is equal to min_tipi_version', async () => {
    // arrange
    await TipiConfig.setConfig('version', '3.2.0');
    const appConfig = createAppConfig({ min_tipi_version: '3.2.0' });
    await insertApp({ status: 'running' }, appConfig, db);

    // act & assert
    await expect(AppsService.updateApp(appConfig.id)).resolves.not.toThrow();
  });
});

describe('installedApps', () => {
  it('Should list installed apps', async () => {
    // arrange
    const appConfig = createAppConfig({});
    const appConfig2 = createAppConfig({});
    const appConfig3 = createAppConfig({});
    createAppConfig({});
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);
    await insertApp({}, appConfig3, db);

    // act
    const apps = await AppsService.installedApps();

    // assert
    expect(apps.length).toBe(3);
  });

  it('Should not list app with invalid config', async () => {
    // arrange
    const appConfig = createAppConfig({ id: '1' });
    const appConfig2 = createAppConfig({ id: '2' });
    const appConfig3 = createAppConfig({ id: '3' });
    createAppConfig({ id: '4' });
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);
    await insertApp({}, appConfig3, db);

    fs.writeFileSync(path.join(DATA_DIR, 'apps', appConfig3.id, 'config.json'), 'invalid json');
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig3.id, 'config.json'), 'invalid json');

    // act
    const apps = await AppsService.installedApps();

    // assert
    expect(apps.length).toBe(2);
  });
});

describe('startAllApps', () => {
  it('should put status to STOPPED if start script fails', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);
    const spy = vi.spyOn(dispatcher, 'dispatchEventAsync');
    spy.mockResolvedValueOnce({ success: false, stdout: 'error' });

    // act
    await AppsService.startAllApps();

    // assert
    await waitForExpect(async () => {
      const apps = await getAllApps(db);
      expect(apps[0]?.status).toBe('stopped');
    });
  });
});
