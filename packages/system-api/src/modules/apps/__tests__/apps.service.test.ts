import fs from 'fs-extra';
import { DataSource } from 'typeorm';
import AppsService from '../apps.service';
import { AppInfo, AppStatusEnum, AppSupportedArchitecturesEnum } from '../apps.types';
import App from '../app.entity';
import { createApp } from './apps.factory';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { getEnvMap } from '../apps.helpers';
import EventDispatcher, { eventDispatcher, EventTypes } from '../../../core/config/EventDispatcher';
import { setConfig } from '../../../core/config/TipiConfig';

jest.mock('fs-extra');
jest.mock('child_process');

let db: DataSource | null = null;
const TEST_SUITE = 'appsservice';

beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValue({ success: true });
  await App.clear();
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

describe('Install app', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const { MockFiles, appInfo } = await createApp({});
    app1 = appInfo;
    // @ts-ignore
    fs.__createMockFiles(MockFiles);
  });

  it('Should correctly generate env file for app', async () => {
    // EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });
    const envFile = fs.readFileSync(`/app/storage/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test\nAPP_DOMAIN=192.168.1.10:${app1.port}`);
  });

  it('Should add app in database', async () => {
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    const app = await App.findOne({ where: { id: app1.id } });

    expect(app).toBeDefined();
    expect(app?.id).toBe(app1.id);
    expect(app?.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app?.status).toBe(AppStatusEnum.RUNNING);
  });

  it('Should start app if already installed', async () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');

    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([EventTypes.APP, ['install', app1.id]]);
    expect(spy.mock.calls[1]).toEqual([EventTypes.APP, ['start', app1.id]]);

    spy.mockRestore();
  });

  it('Should delete app if install script fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'error' });

    await expect(AppsService.installApp(app1.id, { TEST_FIELD: 'test' })).rejects.toThrow(`App ${app1.id} failed to install\nstdout: error`);

    const app = await App.findOne({ where: { id: app1.id } });

    expect(app).toBeNull();
  });

  it('Should throw if required form fields are missing', async () => {
    await expect(AppsService.installApp(app1.id, {})).rejects.toThrowError('Variable TEST_FIELD is required');
  });

  it('Correctly generates a random value if the field has a "random" type', async () => {
    const { appInfo, MockFiles } = await createApp({ randomField: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await AppsService.installApp(appInfo.id, { TEST_FIELD: 'yolo' });
    const envMap = getEnvMap(appInfo.id);

    expect(envMap.get('RANDOM_FIELD')).toBeDefined();
    expect(envMap.get('RANDOM_FIELD')).toHaveLength(32);
  });

  it('Should correctly copy app from repos to apps folder', async () => {
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });
    const appFolder = fs.readdirSync(`/runtipi/apps/${app1.id}`);

    expect(appFolder).toBeDefined();
    expect(appFolder.indexOf('docker-compose.yml')).toBeGreaterThanOrEqual(0);
  });

  it('Should cleanup any app folder existing before install', async () => {
    const { MockFiles, appInfo } = await createApp({});
    app1 = appInfo;
    MockFiles[`/runtipi/apps/${appInfo.id}/docker-compose.yml`] = 'test';
    MockFiles[`/runtipi/apps/${appInfo.id}/test.yml`] = 'test';
    MockFiles[`/runtipi/apps/${appInfo.id}`] = ['test.yml', 'docker-compose.yml'];

    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    expect(fs.existsSync(`/runtipi/apps/${app1.id}/test.yml`)).toBe(true);

    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    expect(fs.existsSync(`/runtipi/apps/${app1.id}/test.yml`)).toBe(false);
    expect(fs.existsSync(`/runtipi/apps/${app1.id}/docker-compose.yml`)).toBe(true);
  });

  it('Should throw if app is exposed and domain is not provided', async () => {
    await expect(AppsService.installApp(app1.id, { TEST_FIELD: 'test' }, true)).rejects.toThrowError('Domain is required if app is exposed');
  });

  it('Should throw if app is exposed and config does not allow it', async () => {
    await expect(AppsService.installApp(app1.id, { TEST_FIELD: 'test' }, true, 'test.com')).rejects.toThrowError(`App ${app1.id} is not exposable`);
  });

  it('Should throw if app is exposed and domain is not valid', async () => {
    const { MockFiles, appInfo } = await createApp({ exposable: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await expect(AppsService.installApp(appInfo.id, { TEST_FIELD: 'test' }, true, 'test')).rejects.toThrowError('Domain test is not valid');
  });

  it('Should throw if app is exposed and domain is already used', async () => {
    const app2 = await createApp({ exposable: true });
    const app3 = await createApp({ exposable: true });
    // @ts-ignore
    fs.__createMockFiles({ ...app2.MockFiles, ...app3.MockFiles });

    await AppsService.installApp(app2.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com');

    await expect(AppsService.installApp(app3.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com')).rejects.toThrowError(`Domain test.com already in use by app ${app2.appInfo.id}`);
  });

  it('Should throw if architecure is not supported', async () => {
    const { MockFiles, appInfo } = await createApp({ supportedArchitectures: [AppSupportedArchitecturesEnum.ARM] });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await expect(AppsService.installApp(appInfo.id, { TEST_FIELD: 'test' })).rejects.toThrowError(`App ${appInfo.id} is not supported on this architecture`);
  });

  it('Can install if architecture is supported', async () => {
    setConfig('architecture', AppSupportedArchitecturesEnum.ARM);
    const { MockFiles, appInfo } = await createApp({ supportedArchitectures: [AppSupportedArchitecturesEnum.ARM, AppSupportedArchitecturesEnum.ARM64] });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await AppsService.installApp(appInfo.id, { TEST_FIELD: 'test' });
    const app = await App.findOne({ where: { id: appInfo.id } });

    expect(app).toBeDefined();
  });

  it('Can install if no architecture is specified', async () => {
    setConfig('architecture', AppSupportedArchitecturesEnum.ARM);
    const { MockFiles, appInfo } = await createApp({ supportedArchitectures: undefined });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await AppsService.installApp(appInfo.id, { TEST_FIELD: 'test' });
    const app = await App.findOne({ where: { id: appInfo.id } });

    expect(app).toBeDefined();
  });
});

describe('Uninstall app', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles));
  });

  it('App should be installed by default', async () => {
    // Act
    const app = await App.findOne({ where: { id: app1.id } });

    // Assert
    expect(app).toBeDefined();
    expect(app?.id).toBe(app1.id);
    expect(app?.status).toBe(AppStatusEnum.RUNNING);
  });

  it('Should correctly remove app from database', async () => {
    // Act
    await AppsService.uninstallApp(app1.id);
    const app = await App.findOne({ where: { id: app1.id } });

    // Assert
    expect(app).toBeNull();
  });

  it('Should stop app if it is running', async () => {
    // Arrange
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');

    // Act
    await AppsService.uninstallApp(app1.id);

    // Assert
    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([EventTypes.APP, ['stop', app1.id]]);
    expect(spy.mock.calls[1]).toEqual([EventTypes.APP, ['uninstall', app1.id]]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    // Act & Assert
    await expect(AppsService.uninstallApp('any')).rejects.toThrowError('App any not found');
  });

  it('Should throw if uninstall script fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'test' });
    await App.update({ id: app1.id }, { status: AppStatusEnum.UPDATING });

    // Act & Assert
    await expect(AppsService.uninstallApp(app1.id)).rejects.toThrow(`App ${app1.id} failed to uninstall\nstdout: test`);
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app?.status).toBe(AppStatusEnum.STOPPED);
  });
});

describe('Start app', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles));
  });

  it('Should correctly dispatch event', async () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');

    await AppsService.startApp(app1.id);

    expect(spy.mock.lastCall).toEqual([EventTypes.APP, ['start', app1.id]]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.startApp('any')).rejects.toThrowError('App any not found');
  });

  it('Should restart if app is already running', async () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');

    await AppsService.startApp(app1.id);
    expect(spy.mock.calls.length).toBe(1);
    await AppsService.startApp(app1.id);
    expect(spy.mock.calls.length).toBe(2);

    spy.mockRestore();
  });

  it('Regenerate env file', async () => {
    fs.writeFile(`/app/storage/app-data/${app1.id}/app.env`, 'TEST=test\nAPP_PORT=3000', () => {});

    await AppsService.startApp(app1.id);

    const envFile = fs.readFileSync(`/app/storage/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test\nAPP_DOMAIN=192.168.1.10:${app1.port}`);
  });

  it('Should throw if start script fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'test' });

    // Act & Assert
    await expect(AppsService.startApp(app1.id)).rejects.toThrow(`App ${app1.id} failed to start\nstdout: test`);
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app?.status).toBe(AppStatusEnum.STOPPED);
  });
});

describe('Stop app', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles));
  });

  it('Should correctly dispatch stop event', async () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');

    await AppsService.stopApp(app1.id);

    expect(spy.mock.lastCall).toEqual([EventTypes.APP, ['stop', app1.id]]);
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.stopApp('any')).rejects.toThrowError('App any not found');
  });

  it('Should throw if stop script fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'test' });

    // Act & Assert
    await expect(AppsService.stopApp(app1.id)).rejects.toThrow(`App ${app1.id} failed to stop\nstdout: test`);
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app?.status).toBe(AppStatusEnum.RUNNING);
  });
});

describe('Update app config', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles));
  });

  it('Should correctly update app config', async () => {
    await AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' });

    const envFile = fs.readFileSync(`/app/storage/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test\nAPP_DOMAIN=192.168.1.10:${app1.port}`);
  });

  it('Should throw if required field is missing', async () => {
    await expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: '' })).rejects.toThrowError('Variable TEST_FIELD is required');
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.updateAppConfig('test-app-2', { test: 'test' })).rejects.toThrowError('App test-app-2 not found');
  });

  it('Should not recreate random field if already present in .env', async () => {
    const { appInfo, MockFiles } = await createApp({ randomField: true, installed: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const envFile = fs.readFileSync(`/app/storage/app-data/${appInfo.id}/app.env`).toString();
    fs.writeFileSync(`/app/storage/app-data/${appInfo.id}/app.env`, `${envFile}\nRANDOM_FIELD=test`);

    await AppsService.updateAppConfig(appInfo.id, { TEST_FIELD: 'test' });

    const envMap = getEnvMap(appInfo.id);

    expect(envMap.get('RANDOM_FIELD')).toBe('test');
  });

  it('Should throw if app is exposed and domain is not provided', () => expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' }, true)).rejects.toThrowError('Domain is required'));

  it('Should throw if app is exposed and domain is not valid', () =>
    expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' }, true, 'test')).rejects.toThrowError('Domain test is not valid'));

  it('Should throw if app is exposed and config does not allow it', () =>
    expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' }, true, 'test.com')).rejects.toThrowError(`App ${app1.id} is not exposable`));

  it('Should throw if app is exposed and domain is already used', async () => {
    const app2 = await createApp({ exposable: true, installed: true });
    const app3 = await createApp({ exposable: true, installed: true });
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app2.MockFiles, app3.MockFiles));

    await AppsService.updateAppConfig(app2.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com');
    await expect(AppsService.updateAppConfig(app3.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com')).rejects.toThrowError(`Domain test.com already in use by app ${app2.appInfo.id}`);
  });

  it('Should not throw if updating with same domain', async () => {
    const app2 = await createApp({ exposable: true, installed: true });
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app2.MockFiles));

    await AppsService.updateAppConfig(app2.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com');
    await AppsService.updateAppConfig(app2.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com');
  });
});

describe('Get app config', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles));
  });

  it('Should correctly get app config', async () => {
    const app = await AppsService.getApp(app1.id);

    expect(app).toBeDefined();
    expect(app.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app.id).toBe(app1.id);
    expect(app.status).toBe(AppStatusEnum.RUNNING);
  });

  it('Should return default values if app is not installed', async () => {
    const appconfig = await AppsService.getApp('test-app2');

    expect(appconfig).toBeDefined();
    expect(appconfig.id).toBe('test-app2');
    expect(appconfig.config).toStrictEqual({});
    expect(appconfig.status).toBe(AppStatusEnum.MISSING);
  });
});

describe('List apps', () => {
  let app1: AppInfo;
  let app2: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    const app2create = await createApp({});
    app1 = app1create.appInfo;
    app2 = app2create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles, app2create.MockFiles));
  });

  it('Should correctly list apps sorted by name', async () => {
    const { apps } = await AppsService.listApps();

    const sortedApps = [app1, app2].sort((a, b) => a.name.localeCompare(b.name));

    expect(apps).toBeDefined();
    expect(apps.length).toBe(2);
    expect(apps.length).toBe(2);
    expect(apps[0].id).toBe(sortedApps[0].id);
    expect(apps[1].id).toBe(sortedApps[1].id);
    expect(apps[0].description).toBe('md desc');
  });

  it('Should not list apps that have supportedArchitectures and are not supported', async () => {
    // Arrange
    setConfig('architecture', AppSupportedArchitecturesEnum.ARM64);
    const app3 = await createApp({ supportedArchitectures: [AppSupportedArchitecturesEnum.ARM] });
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app3.MockFiles));

    // Act
    const { apps } = await AppsService.listApps();

    // Assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(0);
  });

  it('Should list apps that have supportedArchitectures and are supported', async () => {
    // Arrange
    setConfig('architecture', AppSupportedArchitecturesEnum.ARM);
    const app3 = await createApp({ supportedArchitectures: [AppSupportedArchitecturesEnum.ARM] });
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app3.MockFiles));
    // Act
    const { apps } = await AppsService.listApps();

    // Assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it('Should list apps that have no supportedArchitectures specified', async () => {
    // Arrange
    setConfig('architecture', AppSupportedArchitecturesEnum.ARM);
    const app3 = await createApp({ supportedArchitectures: undefined });
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app3.MockFiles));

    // Act
    const { apps } = await AppsService.listApps();

    // Assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });
});

describe('Start all apps', () => {
  let app1: AppInfo;
  let app2: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    const app2create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    app2 = app2create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles, app2create.MockFiles));
  });

  it('Should correctly start all apps', async () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');

    await AppsService.startAllApps();

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls).toEqual([
      [EventTypes.APP, ['start', app1.id]],
      [EventTypes.APP, ['start', app2.id]],
    ]);
  });

  it('Should not start app which has not status RUNNING', async () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEventAsync');
    await createApp({ installed: true, status: AppStatusEnum.STOPPED });

    await AppsService.startAllApps();
    const apps = await App.find();

    expect(spy.mock.calls.length).toBe(2);
    expect(apps.length).toBe(3);
  });

  it('Should put app status to STOPPED if start script fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'error' });

    // Act
    await AppsService.startAllApps();
    const apps = await App.find();

    // Assert
    expect(apps.length).toBe(2);
    expect(apps[0].status).toBe(AppStatusEnum.STOPPED);
    expect(apps[1].status).toBe(AppStatusEnum.STOPPED);
  });
});

describe('Update app', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles));
  });

  it('Should correctly update app', async () => {
    await App.update({ id: app1.id }, { version: 0 });

    const app = await AppsService.updateApp(app1.id);

    expect(app).toBeDefined();
    expect(app.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app.version).toBe(app1.tipi_version);
    expect(app.status).toBe(AppStatusEnum.STOPPED);
  });

  it("Should throw if app doesn't exist", async () => {
    await expect(AppsService.updateApp('test-app2')).rejects.toThrow('App test-app2 not found');
  });

  it('Should throw if update script fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'error' });

    await expect(AppsService.updateApp(app1.id)).rejects.toThrow(`App ${app1.id} failed to update\nstdout: error`);
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app?.status).toBe(AppStatusEnum.STOPPED);
  });
});
