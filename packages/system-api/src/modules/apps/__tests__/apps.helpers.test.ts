import { faker } from '@faker-js/faker';
import fs from 'fs-extra';
import { DataSource } from 'typeorm';
import { getConfig } from '../../../core/config/TipiConfig';
import { setupConnection, teardownConnection } from '../../../test/connection';
import App from '../app.entity';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAppInfo, getAvailableApps, getEnvMap, getUpdateInfo, runAppScript } from '../apps.helpers';
import { AppInfo } from '../apps.types';
import { createApp } from './apps.factory';

jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('internal-ip');

jest.mock('tcp-port-used', () => ({
  check: (port: number) => {
    if (port === 53) {
      return true;
    }
    return false;
  },
}));

let db: DataSource | null = null;
const TEST_SUITE = 'appshelpers';

beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

describe('checkAppRequirements', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({});
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('should return true if there are no particular requirement', async () => {
    const ivValid = await checkAppRequirements(app1.id);
    expect(ivValid).toBe(true);
  });

  it('Should throw an error if app does not exist', async () => {
    await expect(checkAppRequirements('not-existing-app')).rejects.toThrow('App not-existing-app not found');
  });

  it('Should return false if a required port is in use', async () => {
    const { appInfo, MockFiles } = await createApp({ requiredPort: 53 });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const ivValid = await checkAppRequirements(appInfo.id);
    expect(ivValid).toBe(false);
  });
});

describe('getEnvMap', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('should return a map of env vars', async () => {
    const envMap = await getEnvMap(app1.id);

    expect(envMap.get('TEST_FIELD')).toBe('test');
  });
});

describe('checkEnvFile', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('Should not throw if all required fields are present', async () => {
    await checkEnvFile(app1.id);
  });

  it('Should throw if a required field is missing', () => {
    const newAppEnv = 'APP_PORT=test\n';
    fs.writeFileSync(`${getConfig().rootFolder}/app-data/${app1.id}/app.env`, newAppEnv);

    try {
      checkEnvFile(app1.id);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeDefined();
      expect(e.message).toBe('New info needed. App config needs to be updated');
    }
  });
});

describe('runAppScript', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('Should run the app script', async () => {
    const { MockFiles } = await createApp({ installed: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await runAppScript(['install', app1.id]);
  });
});

describe('generateEnvFile', () => {
  let app1: AppInfo;
  let appEntity1: App;
  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    appEntity1 = app1create.appEntity;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('Should generate an env file', async () => {
    const fakevalue = faker.random.alphaNumeric(10);

    generateEnvFile(Object.assign(appEntity1, { config: { TEST_FIELD: fakevalue } }));

    const envmap = await getEnvMap(app1.id);

    expect(envmap.get('TEST_FIELD')).toBe(fakevalue);
  });

  it('Should automatically generate value for random field', async () => {
    const { appEntity, appInfo, MockFiles } = await createApp({ installed: true, randomField: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    generateEnvFile(appEntity);

    const envmap = await getEnvMap(appInfo.id);

    expect(envmap.get('RANDOM_FIELD')).toBeDefined();
    expect(envmap.get('RANDOM_FIELD')).toHaveLength(32);
  });

  it('Should not re-generate random field if it already exists', async () => {
    const { appEntity, appInfo, MockFiles } = await createApp({ installed: true, randomField: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const randomField = faker.random.alphaNumeric(32);

    fs.writeFileSync(`${getConfig().rootFolder}/app-data/${appInfo.id}/app.env`, `RANDOM_FIELD=${randomField}`);

    generateEnvFile(appEntity);

    const envmap = await getEnvMap(appInfo.id);

    expect(envmap.get('RANDOM_FIELD')).toBe(randomField);
  });

  it('Should throw an error if required field is not provided', async () => {
    try {
      generateEnvFile(Object.assign(appEntity1, { config: { TEST_FIELD: undefined } }));
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeDefined();
      expect(e.message).toBe('Variable TEST_FIELD is required');
    }
  });

  it('Should throw an error if app does not exist', async () => {
    try {
      generateEnvFile(Object.assign(appEntity1, { id: 'not-existing-app' }));
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeDefined();
      expect(e.message).toBe('App not-existing-app not found');
    }
  });

  it('Should add APP_EXPOSED to env file', async () => {
    const domain = faker.internet.domainName();
    const { appEntity, appInfo, MockFiles } = await createApp({ installed: true, exposed: true, domain });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    generateEnvFile(appEntity);

    const envmap = await getEnvMap(appInfo.id);

    expect(envmap.get('APP_EXPOSED')).toBe('true');
    expect(envmap.get('APP_DOMAIN')).toBe(domain);
  });

  it('Should not add APP_EXPOSED if domain is not provided', async () => {
    const { appEntity, appInfo, MockFiles } = await createApp({ installed: true, exposed: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    generateEnvFile(appEntity);

    const envmap = await getEnvMap(appInfo.id);

    expect(envmap.get('APP_EXPOSED')).toBeUndefined();
  });

  it('Should not add APP_EXPOSED if app is not exposed', async () => {
    const { appEntity, appInfo, MockFiles } = await createApp({ installed: true, domain: faker.internet.domainName() });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    generateEnvFile(appEntity);

    const envmap = await getEnvMap(appInfo.id);

    expect(envmap.get('APP_EXPOSED')).toBeUndefined();
    expect(envmap.get('APP_DOMAIN')).toBe(`192.168.1.10:${appInfo.port}`);
  });
});

describe('getAvailableApps', () => {
  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    const app2create = await createApp({});
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles, app2create.MockFiles));
  });

  it('Should return all available apps', async () => {
    const availableApps = await getAvailableApps();

    expect(availableApps.length).toBe(2);
  });
});

describe('getAppInfo', () => {
  let app1: AppInfo;
  beforeEach(async () => {
    const app1create = await createApp({ installed: false });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('Should return app info', async () => {
    const appInfo = await getAppInfo(app1.id);

    expect(appInfo?.id).toBe(app1.id);
  });

  it('Should take config.json locally if app is installed', async () => {
    const { appInfo, MockFiles } = await createApp({ installed: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    fs.writeFileSync(`${getConfig().rootFolder}/repos/repo-id/apps/${app1.id}/config.json`, '{}');

    const app = await getAppInfo(appInfo.id);

    expect(app?.id).toEqual(appInfo.id);
  });

  it('Should return null if app does not exist', async () => {
    const app = await getAppInfo(faker.random.word());

    expect(app).toBeNull();
  });
});

describe('getUpdateInfo', () => {
  let app1: AppInfo;
  beforeEach(async () => {
    const app1create = await createApp({ installed: true });
    app1 = app1create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(app1create.MockFiles);
  });

  it('Should return update info', async () => {
    const updateInfo = await getUpdateInfo(app1.id);

    expect(updateInfo?.latest).toBe(app1.tipi_version);
    expect(updateInfo?.current).toBe(1);
  });

  it('Should return null if app is not installed', async () => {
    const updateInfo = await getUpdateInfo(faker.random.word());

    expect(updateInfo).toBeNull();
  });
});
