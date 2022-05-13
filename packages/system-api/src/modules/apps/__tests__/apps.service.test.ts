import AppsService from '../apps.service';
import fs from 'fs';
import config from '../../../config';
import { AppConfig, FieldTypes } from '../../../config/types';
import childProcess from 'child_process';

jest.mock('fs');
jest.mock('child_process');

beforeEach(() => {
  jest.resetModules();
  jest.resetAllMocks();
});

const testApp: Partial<AppConfig> = {
  id: 'test-app',
  port: 3000,
  available: true,
  form_fields: {
    test: {
      type: FieldTypes.text,
      label: 'Test field',
      required: true,
      env_variable: 'TEST_FIELD',
    },
    test2: {
      type: FieldTypes.text,
      label: 'Test field 2',
      required: false,
      env_variable: 'TEST_FIELD_2',
    },
  },
};

const testApp2: Partial<AppConfig> = {
  available: true,
  id: 'test-app2',
};

const testApp3: Partial<AppConfig> = {
  id: 'test-app3',
};

const MOCK_FILE_EMPTY = {
  [`${config.ROOT_FOLDER}/apps/test-app/config.json`]: JSON.stringify(testApp),
  [`${config.ROOT_FOLDER}/.env`]: 'TEST=test',
  [`${config.ROOT_FOLDER}/state/apps.json`]: '{"installed": ""}',
};

const MOCK_FILE_INSTALLED = {
  [`${config.ROOT_FOLDER}/apps/test-app/config.json`]: JSON.stringify(testApp),
  [`${config.ROOT_FOLDER}/apps/test-app2/config.json`]: JSON.stringify(testApp2),
  [`${config.ROOT_FOLDER}/apps/test-app3/config.json`]: JSON.stringify(testApp3),
  [`${config.ROOT_FOLDER}/.env`]: 'TEST=test',
  [`${config.ROOT_FOLDER}/state/apps.json`]: '{"installed": "test-app"}',
  [`${config.ROOT_FOLDER}/app-data/test-app`]: '',
  [`${config.ROOT_FOLDER}/app-data/test-app/app.env`]: 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test',
};

describe('Install app', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_EMPTY);
  });

  it('Should correctly generate env file for app', async () => {
    await AppsService.installApp('test-app', { test: 'test' });

    const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/test-app/app.env`).toString();

    expect(envFile.trim()).toBe('TEST=test\nAPP_PORT=3000\nTEST_FIELD=test');
  });

  it('Should add app to state file', async () => {
    await AppsService.installApp('test-app', { test: 'test' });

    const stateFile = JSON.parse(fs.readFileSync(`${config.ROOT_FOLDER}/state/apps.json`).toString());

    expect(stateFile.installed).toBe(' test-app');
  });

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.installApp('test-app', { test: 'test' });

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['install', 'test-app'], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should start app if already installed', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.installApp('test-app', { test: 'test' });
    await AppsService.installApp('test-app', { test: 'test' });

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['install', 'test-app'], {}, expect.any(Function)]);
    expect(spy.mock.calls[1]).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['start', 'test-app'], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should throw if required form fields are missing', async () => {
    await expect(AppsService.installApp('test-app', {})).rejects.toThrowError('Variable test is required');
  });
});

describe('Uninstall app', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_INSTALLED);
  });

  it('Should correctly remove app from state file', async () => {
    await AppsService.uninstallApp('test-app');

    const stateFile = JSON.parse(fs.readFileSync(`${config.ROOT_FOLDER}/state/apps.json`).toString());

    expect(stateFile.installed).toBe('');
  });

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.uninstallApp('test-app');

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['uninstall', 'test-app'], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.uninstallApp('test-app-2')).rejects.toThrowError('App test-app-2 not installed');
  });
});

describe('Start app', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_INSTALLED);
  });

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.startApp('test-app');

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['start', 'test-app'], {}, expect.any(Function)]);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.startApp('test-app-2')).rejects.toThrowError('App test-app-2 not installed');
  });

  it('Should restart if app is already running', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.startApp('test-app');
    expect(spy.mock.calls.length).toBe(1);
    await AppsService.startApp('test-app');
    expect(spy.mock.calls.length).toBe(2);

    spy.mockRestore();
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.startApp('test-app-2')).rejects.toThrowError('App test-app-2 not installed');
  });

  it('Regenerate env file', async () => {
    fs.writeFile(`${config.ROOT_FOLDER}/app-data/test-app/app.env`, 'TEST=test\nAPP_PORT=3000', () => {});

    await AppsService.startApp('test-app');

    const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/test-app/app.env`).toString();

    expect(envFile.trim()).toBe('TEST=test\nAPP_PORT=3000\nTEST_FIELD=test');
  });
});

describe('Stop app', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_INSTALLED);
  });

  it('Should correctly run app script', async () => {
    const spy = jest.spyOn(childProcess, 'execFile');

    await AppsService.stopApp('test-app');

    expect(spy.mock.lastCall).toEqual([`${config.ROOT_FOLDER}/scripts/app.sh`, ['stop', 'test-app'], {}, expect.any(Function)]);
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.stopApp('test-app-2')).rejects.toThrowError('App test-app-2 not installed');
  });
});

describe('Update app config', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_INSTALLED);
  });

  it('Should correctly update app config', async () => {
    await AppsService.updateAppConfig('test-app', { test: 'test', test2: 'test2' });

    const envFile = fs.readFileSync(`${config.ROOT_FOLDER}/app-data/test-app/app.env`).toString();

    expect(envFile.trim()).toBe('TEST=test\nAPP_PORT=3000\nTEST_FIELD=test\nTEST_FIELD_2=test2');
  });

  it('Should throw if app is not installed', async () => {
    await expect(AppsService.updateAppConfig('test-app-2', { test: 'test' })).rejects.toThrowError('App test-app-2 not installed');
  });

  it('Should throw if required form fields are missing', async () => {
    await expect(AppsService.updateAppConfig('test-app', {})).rejects.toThrowError('Variable test is required');
  });
});

describe('Get app config', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_INSTALLED);
  });

  it('Should correctly get app config', async () => {
    const appconfig = await AppsService.getAppInfo('test-app');

    expect(appconfig).toEqual({ ...testApp, installed: true, status: 'stopped' });
  });

  it('Should have installed false if app is not installed', async () => {
    const appconfig = await AppsService.getAppInfo('test-app2');

    expect(appconfig).toEqual({ ...testApp2, installed: false, status: 'stopped' });
  });
});

describe('List apps', () => {
  beforeEach(() => {
    // @ts-ignore
    fs.__createMockFiles(MOCK_FILE_INSTALLED);
  });

  it('Should correctly list apps', async () => {
    const apps = await AppsService.listApps();

    expect(apps).toEqual([
      { ...testApp, installed: true, status: 'stopped' },
      { ...testApp2, installed: false, status: 'stopped' },
    ]);
    expect(apps.length).toBe(2);
    expect(apps[0].id).toBe('test-app');
    expect(apps[1].id).toBe('test-app2');
  });
});
