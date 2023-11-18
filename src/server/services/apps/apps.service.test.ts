import fs from 'fs-extra';
import waitForExpect from 'wait-for-expect';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { faker } from '@faker-js/faker';
import { waitUntilFinishedMock } from '@/tests/server/jest.setup';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { AppServiceClass } from './apps.service';
import { EventDispatcher } from '../../core/EventDispatcher';
import { getAllApps, getAppById, updateApp, createAppConfig, insertApp } from '../../tests/apps.factory';
import { setConfig } from '../../core/TipiConfig';

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
  dispatcher.dispatchEventAsync = jest.fn().mockResolvedValue({ success: true });
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
    expect(dbApp?.status).toBe('running');
  });

  it('Should start app if already installed', async () => {
    // arrange
    const appConfig = createAppConfig();

    // act
    await AppsService.installApp(appConfig.id, {});
    await AppsService.installApp(appConfig.id, {});
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app?.status).toBe('running');
  });

  it('Should delete app if install script fails', async () => {
    // arrange
    const appConfig = createAppConfig();

    // act
    waitUntilFinishedMock.mockResolvedValueOnce({ success: false, stdout: 'test' });
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrow('server-messages.errors.app-failed-to-install');
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app).toBeNull();
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true })).rejects.toThrowError('server-messages.errors.domain-required-if-expose-app');
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true, domain: 'test.com' })).rejects.toThrowError('server-messages.errors.app-not-exposable');
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true, domain: 'test' })).rejects.toThrowError('server-messages.errors.domain-not-valid');
  });

  it('Should throw if app is exposed and domain is already used by another exposed app', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig2, db);

    // act & assert
    await expect(AppsService.installApp(appConfig.id, { exposed: true, domain })).rejects.toThrowError('server-messages.errors.domain-already-in-use');
  });

  it('Should throw if architecure is not supported', async () => {
    // arrange
    setConfig('architecture', 'amd64');
    const appConfig = createAppConfig({ supported_architectures: ['arm64'] });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrowError(`App ${appConfig.id} is not supported on this architecture`);
  });

  it('Can install if architecture is supported', async () => {
    // arrange
    setConfig('architecture', 'arm');
    const appConfig = createAppConfig({ supported_architectures: ['arm'] });

    // act
    await AppsService.installApp(appConfig.id, {});
    const app = await getAppById(appConfig.id, db);

    expect(app).toBeDefined();
  });

  it('Can install if no architecture is specified', async () => {
    // arrange
    setConfig('architecture', 'arm');
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
    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appConfig.id}/config.json`, 'test');

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrowError(`App ${appConfig.id} has invalid config.json file`);
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });

    // act & assert
    await expect(AppsService.installApp(appConfig.id, {})).rejects.toThrowError();
  });
});

describe('Uninstall app', () => {
  it('Should correctly remove app from database', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({}, appConfig, db);

    // act
    await AppsService.uninstallApp(appConfig.id);
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app).toBeNull();
  });

  it('Should stop app if it is running', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);

    // act
    waitUntilFinishedMock.mockResolvedValueOnce({ success: true, stdout: 'test' });
    waitUntilFinishedMock.mockResolvedValueOnce({ success: false, stdout: 'test' });
    await expect(AppsService.uninstallApp(appConfig.id)).rejects.toThrow('server-messages.errors.app-failed-to-uninstall');
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app?.status).toBe('stopped');
  });

  it('Should throw if app is not installed', async () => {
    // act & assert
    await expect(AppsService.uninstallApp('any')).rejects.toThrowError('server-messages.errors.app-not-found');
  });

  it('Should throw if uninstall script fails', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);
    waitUntilFinishedMock.mockResolvedValueOnce({ success: false, stdout: 'test' });
    await updateApp(appConfig.id, { status: 'updating' }, db);

    // act & assert
    await expect(AppsService.uninstallApp(appConfig.id)).rejects.toThrow('server-messages.errors.app-failed-to-uninstall');
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('stopped');
  });
});

describe('Start app', () => {
  it('Should correctly start app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);

    // act
    await AppsService.startApp(appConfig.id);
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app?.status).toBe('running');
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.startApp('any')).rejects.toThrowError('server-messages.errors.app-not-found');
  });

  it('Should restart if app is already running', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);

    // act
    await AppsService.startApp(appConfig.id);
    await AppsService.startApp(appConfig.id);
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app?.status).toBe('running');
  });

  it('Should throw if start script fails', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'stopped' }, appConfig, db);
    waitUntilFinishedMock.mockResolvedValueOnce({ success: false, stdout: 'test' });

    // act & assert
    await expect(AppsService.startApp(appConfig.id)).rejects.toThrow('server-messages.errors.app-failed-to-start');
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('stopped');
  });
});

describe('Stop app', () => {
  it('Should correctly stop app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);

    // act
    await AppsService.stopApp(appConfig.id);
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app?.status).toBe('stopped');
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.stopApp('any')).rejects.toThrowError('server-messages.errors.app-not-found');
  });

  it('Should throw if stop script fails', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);
    waitUntilFinishedMock.mockResolvedValueOnce({ success: false, stdout: 'test' });

    // act & assert
    await expect(AppsService.stopApp(appConfig.id)).rejects.toThrow('server-messages.errors.app-failed-to-stop');
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('running');
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
    await expect(AppsService.updateAppConfig('test-app-2', { test: 'test' })).rejects.toThrowError('server-messages.errors.app-not-found');
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    expect(AppsService.updateAppConfig(appConfig.id, { exposed: true })).rejects.toThrowError('server-messages.errors.domain-required-if-expose-app');
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: true });
    await insertApp({}, appConfig, db);

    // act & assert
    expect(AppsService.updateAppConfig(appConfig.id, { exposed: true, domain: 'test' })).rejects.toThrowError('server-messages.errors.domain-not-valid');
  });

  it('Should throw if app is exposed and domain is already used', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig({ exposable: true });
    const appConfig2 = createAppConfig({ exposable: true });
    await insertApp({ domain, exposed: true }, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig2.id, { exposed: true, domain })).rejects.toThrowError('server-messages.errors.domain-already-in-use');
  });

  it('should throw if app is not exposed and config has force_expose set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ force_expose: true });
    await insertApp({ exposed: true }, appConfig, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig.id, {})).rejects.toThrowError('server-messages.errors.app-force-exposed');
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    // arrange
    const appConfig = createAppConfig({ exposable: false });
    await insertApp({}, appConfig, db);

    // act & assert
    await expect(AppsService.updateAppConfig(appConfig.id, { exposed: true, domain: 'test.com' })).rejects.toThrowError('server-messages.errors.app-not-exposable');
  });
});

describe('Reset app', () => {
  it('Should correctly reset app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ status: 'running' }, appConfig, db);

    // act
    await AppsService.resetApp(appConfig.id);
    const app = await getAppById(appConfig.id, db);

    // assert
    expect(app?.status).toBe('running');
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
  it('Should correctly list apps sorted by id', async () => {
    // arrange
    const randomName1 = faker.lorem.word();
    const randomName2 = faker.lorem.word();
    const sortedNames = [randomName1, randomName2].sort((a, b) => a.localeCompare(b));

    const appConfig = createAppConfig({ id: randomName1.toLowerCase(), name: randomName1 });
    const appConfig2 = createAppConfig({ id: randomName2.toLowerCase(), name: randomName2 });
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act
    const { apps } = await AppServiceClass.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(2);
    expect(apps[0]?.name).toBe(sortedNames[0]);
    expect(apps[1]?.name).toBe(sortedNames[1]);
  });

  it('Should not list apps that have supportedArchitectures and are not supported', async () => {
    // arrange
    setConfig('architecture', 'arm64');
    createAppConfig({ supported_architectures: ['amd64'] });

    // act
    const { apps } = await AppServiceClass.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(0);
  });

  it('Should list apps that have supportedArchitectures and are supported', async () => {
    // arrange
    setConfig('architecture', 'arm');
    createAppConfig({ supported_architectures: ['arm'] });

    // act
    const { apps } = await AppServiceClass.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it('Should list apps that have no supportedArchitectures specified', async () => {
    // Arrange
    setConfig('architecture', 'arm');
    createAppConfig({ supported_architectures: undefined });

    // act
    const { apps } = await AppServiceClass.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it('Should not list app with invalid config.json', async () => {
    // arrange
    const appInfo = createAppConfig({});
    createAppConfig({});
    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appInfo.id}/config.json`, 'invalid json');

    // act
    const { apps } = await AppServiceClass.listApps();

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });
});

describe('Update app', () => {
  it('Should correctly update app', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ version: 12, config: { TEST_FIELD: 'test' } }, appConfig, db);

    // act
    await updateApp(appConfig.id, { version: 0 }, db);
    const app = await AppsService.updateApp(appConfig.id);

    // assert
    expect(app).toBeDefined();
    expect(app?.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app?.version).toBe(appConfig.tipi_version);
    expect(app?.status).toBe('stopped');
  });

  it("Should throw if app doesn't exist", async () => {
    await expect(AppsService.updateApp('test-app2')).rejects.toThrow('server-messages.errors.app-not-found');
  });

  it('Should throw if update script fails', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({}, appConfig, db);
    waitUntilFinishedMock.mockResolvedValueOnce({ success: false, stdout: 'error' });

    // act & assert
    await expect(AppsService.updateApp(appConfig.id)).rejects.toThrow('server-messages.errors.app-failed-to-update');
    const app = await getAppById(appConfig.id, db);
    expect(app?.status).toBe('stopped');
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

    fs.writeFileSync(`/runtipi/apps/${appConfig3.id}/config.json`, 'invalid json');
    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appConfig3.id}/config.json`, 'invalid json');

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
    const spy = jest.spyOn(dispatcher, 'dispatchEventAsync');
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
