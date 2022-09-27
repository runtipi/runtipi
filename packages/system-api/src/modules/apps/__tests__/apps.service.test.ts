import AppsService from '../apps.service';
import fs from 'fs-extra';
import childProcess from 'child_process';
import { AppInfo, AppStatusEnum } from '../apps.types';
import App from '../app.entity';
import { createApp } from './apps.factory';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { DataSource } from 'typeorm';
import { getEnvMap } from '../apps.helpers';
import { getConfig } from '../../../core/config/TipiConfig';

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
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });
    const envFile = fs.readFileSync(`/app/storage/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test\nAPP_DOMAIN=192.168.1.10:${app1.port}`);
  });

  it('Should add app in database', async () => {
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    const app = await App.findOne({ where: { id: app1.id } });

    expect(app).toBeDefined();
    expect(app!.id).toBe(app1.id);
    expect(app!.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app!.status).toBe(AppStatusEnum.RUNNING);
  });

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    expect(spy.mock.lastCall).toEqual([`${getConfig().rootFolder}/scripts/app.sh`, ['install', app1.id], {}, expect.any(Function)]);
    spy.mockRestore();
  });

  it('Should start app if already installed', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual(['/runtipi/scripts/app.sh', ['install', app1.id], {}, expect.any(Function)]);
    expect(spy.mock.calls[1]).toEqual(['/runtipi/scripts/app.sh', ['start', app1.id], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should delete app if install script fails', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });

    await expect(AppsService.installApp(app1.id, { TEST_FIELD: 'test' })).rejects.toThrow('Test error');

    const app = await App.findOne({ where: { id: app1.id } });

    expect(app).toBeNull();
    spy.mockRestore();
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
    const appFolder = fs.readdirSync(`/app/storage/apps/${app1.id}`);

    expect(appFolder).toBeDefined();
    expect(appFolder.indexOf('docker-compose.yml')).toBeGreaterThanOrEqual(0);
  });

  it('Should cleanup any app folder existing before install', async () => {
    const { MockFiles, appInfo } = await createApp({});
    app1 = appInfo;
    MockFiles[`/app/storage/apps/${appInfo.id}/docker-compose.yml`] = 'test';
    MockFiles[`/app/storage/apps/${appInfo.id}/test.yml`] = 'test';
    MockFiles[`/app/storage/apps/${appInfo.id}`] = ['test.yml', 'docker-compose.yml'];

    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    expect(fs.existsSync(`/app/storage/apps/${app1.id}/test.yml`)).toBe(true);

    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    expect(fs.existsSync(`/app/storage/apps/${app1.id}/test.yml`)).toBe(false);
    expect(fs.existsSync(`/app/storage/apps/${app1.id}/docker-compose.yml`)).toBe(true);
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
    fs.__createMockFiles(Object.assign({}, app2.MockFiles, app3.MockFiles));

    await AppsService.installApp(app2.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com');

    await expect(AppsService.installApp(app3.appInfo.id, { TEST_FIELD: 'test' }, true, 'test.com')).rejects.toThrowError(`Domain test.com already in use by app ${app2.appInfo.id}`);
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
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app).toBeDefined();
    expect(app!.id).toBe(app1.id);
    expect(app!.status).toBe(AppStatusEnum.RUNNING);
  });

  it('Should correctly remove app from database', async () => {
    await AppsService.uninstallApp(app1.id);

    const app = await App.findOne({ where: { id: app1.id } });

    expect(app).toBeNull();
  });

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.uninstallApp(app1.id);

    expect(spy.mock.lastCall).toEqual([`${getConfig().rootFolder}/scripts/app.sh`, ['uninstall', app1.id], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should stop app if it is running', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.uninstallApp(app1.id);

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([`${getConfig().rootFolder}/scripts/app.sh`, ['stop', app1.id], {}, expect.any(Function)]);
    expect(spy.mock.calls[1]).toEqual([`${getConfig().rootFolder}/scripts/app.sh`, ['uninstall', app1.id], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.uninstallApp('any')).rejects.toThrowError('App any not found');
  });

  it('Should throw if uninstall script fails', async () => {
    // Update app
    await App.update({ id: app1.id }, { status: AppStatusEnum.UPDATING });

    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });

    await expect(AppsService.uninstallApp(app1.id)).rejects.toThrow('Test error');
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app!.status).toBe(AppStatusEnum.STOPPED);
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

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.startApp(app1.id);

    expect(spy.mock.lastCall).toEqual([`${getConfig().rootFolder}/scripts/app.sh`, ['start', app1.id], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.startApp('any')).rejects.toThrowError('App any not found');
  });

  it('Should restart if app is already running', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

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
    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });

    await expect(AppsService.startApp(app1.id)).rejects.toThrow('Test error');
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app!.status).toBe(AppStatusEnum.STOPPED);
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

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.stopApp(app1.id);

    expect(spy.mock.lastCall).toEqual([`${getConfig().rootFolder}/scripts/app.sh`, ['stop', app1.id], {}, expect.any(Function)]);
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.stopApp('any')).rejects.toThrowError('App any not found');
  });

  it('Should throw if stop script fails', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });

    await expect(AppsService.stopApp(app1.id)).rejects.toThrow('Test error');
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app!.status).toBe(AppStatusEnum.RUNNING);
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

  it('Should throw if app is exposed and domain is not provided', () => {
    return expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' }, true)).rejects.toThrowError('Domain is required');
  });

  it('Should throw if app is exposed and domain is not valid', () => {
    return expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' }, true, 'test')).rejects.toThrowError('Domain test is not valid');
  });

  it('Should throw if app is exposed and config does not allow it', () => {
    return expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: 'test' }, true, 'test.com')).rejects.toThrowError(`App ${app1.id} is not exposable`);
  });

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
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.startAllApps();

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls).toEqual([
      [`${getConfig().rootFolder}/scripts/app.sh`, ['start', app1.id], {}, expect.any(Function)],
      [`${getConfig().rootFolder}/scripts/app.sh`, ['start', app2.id], {}, expect.any(Function)],
    ]);
  });

  it('Should not start app which has not status RUNNING', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    await createApp({ installed: true, status: AppStatusEnum.STOPPED });

    await AppsService.startAllApps();
    const apps = await App.find();

    expect(spy.mock.calls.length).toBe(2);
    expect(apps.length).toBe(3);
  });

  it('Should put app status to STOPPED if start script fails', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });

    await AppsService.startAllApps();

    const apps = await App.find();

    expect(spy.mock.calls.length).toBe(2);
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
    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });

    await expect(AppsService.updateApp(app1.id)).rejects.toThrow('Test error');
    const app = await App.findOne({ where: { id: app1.id } });
    expect(app!.status).toBe(AppStatusEnum.STOPPED);
  });
});
