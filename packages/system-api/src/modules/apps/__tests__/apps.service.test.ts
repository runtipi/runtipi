import AppsService from '../apps.service';
import fs from 'fs-extra';
import config from '../../../config';
import childProcess from 'child_process';
import { AppInfo, AppStatusEnum } from '../apps.types';
import App from '../app.entity';
import { createApp } from './apps.factory';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { DataSource } from 'typeorm';

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
    const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test`);
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

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['install', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);
    spy.mockRestore();
  });

  it('Should start app if already installed', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });
    await AppsService.installApp(app1.id, { TEST_FIELD: 'test' });

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['install', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);
    expect(spy.mock.calls[1]).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['start', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);

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
    // const { appInfo } = await createApp({ randomField: true });
    // await AppsService.installApp(appInfo.id, { TEST_FIELD: 'test' });
    // const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/${appInfo.id}/app.env`).toString();
    // expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${appInfo.port}\nTEST_FIELD=${appInfo.randomValue}`);
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

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['uninstall', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should stop app if it is running', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.uninstallApp(app1.id);

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['stop', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);
    expect(spy.mock.calls[1]).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['uninstall', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.uninstallApp('any')).rejects.toThrowError('App any not found');
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

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['start', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);

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
    fs.writeFile(`${config.ROOT_FOLDER}/app-data/${app1.id}/app.env`, 'TEST=test\nAPP_PORT=3000', () => {});

    await AppsService.startApp(app1.id);

    const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test`);
  });

  it('Should throw if start script fails', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    spy.mockImplementation(() => {
      throw new Error('Test error');
    });
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

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['stop', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)]);
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.stopApp('any')).rejects.toThrowError('App any not found');
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

    const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/${app1.id}/app.env`).toString();

    expect(envFile.trim()).toBe(`TEST=test\nAPP_PORT=${app1.port}\nTEST_FIELD=test`);
  });

  it('Should throw if required field is missing', async () => {
    await expect(AppsService.updateAppConfig(app1.id, { TEST_FIELD: '' })).rejects.toThrowError('Variable TEST_FIELD is required');
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.updateAppConfig('test-app-2', { test: 'test' })).rejects.toThrowError('App test-app-2 not found');
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
      [`${config.ROOT_FOLDER}/scripts/app.sh`, ['start', app1.id, '/tipi', 'repo-id'], {}, expect.any(Function)],
      [`${config.ROOT_FOLDER}/scripts/app.sh`, ['start', app2.id, '/tipi', 'repo-id'], {}, expect.any(Function)],
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
