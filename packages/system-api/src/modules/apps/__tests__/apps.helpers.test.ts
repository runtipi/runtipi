import { faker } from '@faker-js/faker';
import fs from 'fs-extra';
import { DataSource } from 'typeorm';
import logger from '../../../config/logger/logger';
import { setupConnection, teardownConnection } from '../../../test/connection';
import App from '../app.entity';
import { checkAppRequirements, checkEnvFile, ensureAppFolder, generateEnvFile, getAppInfo, getAvailableApps, getEnvMap, getUpdateInfo } from '../apps.helpers';
import { AppCategoriesEnum, AppInfo } from '../apps.types';
import { createApp, createAppConfig } from './apps.factory';

jest.mock('fs-extra');
jest.mock('child_process');

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
    await expect(checkAppRequirements('not-existing-app')).rejects.toThrow('App not-existing-app has invalid config.json file');
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
    fs.writeFileSync(`/app/storage/app-data/${app1.id}/app.env`, newAppEnv);

    try {
      checkEnvFile(app1.id);
      expect(true).toBe(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e).toBeDefined();
        expect(e.message).toBe('New info needed. App config needs to be updated');
      } else {
        fail('Should throw an error');
      }
    }
  });
});

describe('Test: generateEnvFile', () => {
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

    fs.writeFileSync(`/app/storage/app-data/${appInfo.id}/app.env`, `RANDOM_FIELD=${randomField}`);

    generateEnvFile(appEntity);

    const envmap = await getEnvMap(appInfo.id);

    expect(envmap.get('RANDOM_FIELD')).toBe(randomField);
  });

  it('Should throw an error if required field is not provided', async () => {
    try {
      generateEnvFile(Object.assign(appEntity1, { config: { TEST_FIELD: undefined } }));
      expect(true).toBe(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e).toBeDefined();
        expect(e.message).toBe('Variable TEST_FIELD is required');
      } else {
        fail('Should throw an error');
      }
    }
  });

  it('Should throw an error if app does not exist', async () => {
    try {
      generateEnvFile(Object.assign(appEntity1, { id: 'not-existing-app' }));
      expect(true).toBe(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e).toBeDefined();
        expect(e.message).toBe('App not-existing-app has invalid config.json file');
      } else {
        fail('Should throw an error');
      }
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

  it('Should create app folder if it does not exist', async () => {
    const { appEntity, appInfo, MockFiles } = await createApp({ installed: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    fs.rmSync(`/app/storage/app-data/${appInfo.id}`, { recursive: true });

    generateEnvFile(appEntity);

    expect(fs.existsSync(`/app/storage/app-data/${appInfo.id}`)).toBe(true);
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

describe('Test: getAppInfo', () => {
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
    const { appInfo, MockFiles, appEntity } = await createApp({ installed: true });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const newConfig = createAppConfig();

    fs.writeFileSync(`/runtipi/apps/${appInfo.id}/config.json`, JSON.stringify(newConfig));

    const app = await getAppInfo(appInfo.id, appEntity.status);

    expect(app?.id).toEqual(newConfig.id);
  });

  it('Should take config.json from repo if app is not installed', async () => {
    const { appInfo, MockFiles, appEntity } = await createApp({ installed: false });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const newConfig = createAppConfig();

    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appInfo.id}/config.json`, JSON.stringify(newConfig));

    const app = await getAppInfo(appInfo.id, appEntity.status);

    expect(app?.id).toEqual(newConfig.id);
  });

  it('Should return null if app is not available', async () => {
    const { appInfo, MockFiles, appEntity } = await createApp({ installed: false });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const newConfig = {
      id: faker.random.alphaNumeric(32),
      available: false,
    };

    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appInfo.id}/config.json`, JSON.stringify(newConfig));

    const app = await getAppInfo(appInfo.id, appEntity.status);

    expect(app).toBeNull();
  });

  it('Should throw if something goes wrong', async () => {
    const log = jest.spyOn(logger, 'error');
    const spy = jest.spyOn(fs, 'existsSync').mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const { appInfo, MockFiles, appEntity } = await createApp({ installed: false });
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const newConfig = {
      id: faker.random.alphaNumeric(32),
      available: false,
    };

    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appInfo.id}/config.json`, JSON.stringify(newConfig));

    try {
      await getAppInfo(appInfo.id, appEntity.status);
      expect(true).toBe(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toBe(`Error loading app: ${appInfo.id}`);
        expect(log).toBeCalledWith(`Error loading app: ${appInfo.id}`);
      } else {
        expect(true).toBe(false);
      }
    }

    spy.mockRestore();
    log.mockRestore();
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
    const updateInfo = await getUpdateInfo(app1.id, 1);

    expect(updateInfo?.latest).toBe(app1.tipi_version);
    expect(updateInfo?.current).toBe(1);
  });

  it('Should return null if app is not installed', async () => {
    const updateInfo = await getUpdateInfo(faker.random.word(), 1);

    expect(updateInfo).toBeNull();
  });
});

describe('Test: ensureAppFolder', () => {
  beforeEach(() => {
    const mockFiles = {
      [`/runtipi/repos/repo-id/apps/test`]: ['test.yml'],
    };
    // @ts-ignore
    fs.__createMockFiles(mockFiles);
  });

  it('should copy the folder from repo', () => {
    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual(['test.yml']);
  });

  it('should not copy the folder if it already exists', () => {
    const mockFiles = {
      [`/runtipi/repos/repo-id/apps/test`]: ['test.yml'],
      '/runtipi/apps/test': ['docker-compose.yml'],
      '/runtipi/apps/test/docker-compose.yml': 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual(['docker-compose.yml']);
  });

  it('Should overwrite the folder if clean up is true', () => {
    const mockFiles = {
      [`/runtipi/repos/repo-id/apps/test`]: ['test.yml'],
      '/runtipi/apps/test': ['docker-compose.yml'],
      '/runtipi/apps/test/docker-compose.yml': 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test', true);

    // Assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual(['test.yml']);
  });

  it('Should delete folder if it exists but has no docker-compose.yml file', () => {
    // Arrange
    const randomFileName = `${faker.random.word()}.yml`;
    const mockFiles = {
      [`/runtipi/repos/repo-id/apps/test`]: [randomFileName],
      '/runtipi/apps/test': ['test.yml'],
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual([randomFileName]);
  });
});
