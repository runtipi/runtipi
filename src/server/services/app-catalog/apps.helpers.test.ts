import fs from 'fs-extra';
import { fromAny } from '@total-typescript/shoehorn';
import { faker } from '@faker-js/faker';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { appInfoSchema } from '@runtipi/shared';
import path from 'path';
import { DATA_DIR } from '@/config/constants';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { TipiConfig } from '../../core/TipiConfig';
import { checkAppRequirements, getAppInfo, getAvailableApps, getUpdateInfo } from './apps.helpers';
import { createAppConfig, insertApp } from '../../tests/apps.factory';

let db: TestDatabase;
const TEST_SUITE = 'appshelpers';

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
});

beforeEach(async () => {
  await clearDatabase(db);
});

afterAll(async () => {
  await closeDatabase(db);
});

describe('Test: checkAppRequirements()', () => {
  it('should return appInfo if there are no particular requirement', async () => {
    // arrange
    const appConfig = createAppConfig();

    // act
    const result = checkAppRequirements(appConfig.id);

    // assert
    expect(result.id).toEqual(appConfig.id);
  });

  it('Should throw an error if app does not exist', async () => {
    expect(() => checkAppRequirements('notexisting')).toThrowError('App notexisting has invalid config.json');
  });

  it('Should throw if architecture is not supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    const appConfig = createAppConfig({ supported_architectures: ['arm'] });

    // assert
    expect(() => checkAppRequirements(appConfig.id)).toThrowError(`App ${appConfig.id} is not supported on this architecture`);
  });
});

describe('Test: appInfoSchema', () => {
  it('should default form_field type to text if it is wrong', async () => {
    // arrange
    const appConfig = createAppConfig(fromAny({ form_fields: [{ env_variable: 'test', type: 'wrong', label: 'yo', required: true }] }));
    await fs.promises.mkdir(`/app/storage/app-data/${appConfig.id}`, { recursive: true });
    await fs.promises.writeFile(`/app/storage/app-data/${appConfig.id}/config.json`, JSON.stringify(appConfig));

    // act
    const appInfo = appInfoSchema.safeParse(appConfig);

    // assert
    expect(appInfo.success).toBe(true);
    if (appInfo.success) {
      expect(appInfo.data.form_fields[0]?.type).toBe('text');
    } else {
      expect(true).toBe(false);
    }
  });

  it('should default categories to ["utilities"] if it is wrong', async () => {
    // arrange
    const appConfig = createAppConfig(fromAny({ categories: 'wrong' }));
    await fs.promises.mkdir(`/app/storage/app-data/${appConfig.id}`, { recursive: true });
    await fs.promises.writeFile(`/app/storage/app-data/${appConfig.id}/config.json`, JSON.stringify(appConfig));

    // act
    const appInfo = appInfoSchema.safeParse(appConfig);

    // assert
    expect(appInfo.success).toBe(true);
    if (appInfo.success) {
      expect(appInfo.data.categories).toStrictEqual(['utilities']);
    } else {
      expect(true).toBe(false);
    }
  });
});

describe('Test: getAvailableApps()', () => {
  it.skip('Should return all available apps', async () => {
    // arrange
    createAppConfig();
    createAppConfig();

    // act
    const availableApps = await getAvailableApps();

    // assert
    expect(availableApps.length).toBe(2);
  });

  it.skip('Should not return apps with invalid config.json', async () => {
    // arrange
    const appConfig = createAppConfig();
    createAppConfig();
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'invalid json');

    // act
    const availableApps = await getAvailableApps();

    // assert
    expect(availableApps.length).toBe(1);
  });
});

describe('Test: getAppInfo()', () => {
  it('Should return app info', async () => {
    // arrange
    const appConfig = createAppConfig();

    // act
    const appInfo = getAppInfo(appConfig.id);

    // assert
    expect(appInfo?.id).toBe(appConfig.id);
  });

  it('Should take config.json locally if app is installed', async () => {
    // arrange
    const appConfig = createAppConfig();
    const secondAppConfig = createAppConfig();
    const app = await insertApp({}, appConfig, db);
    fs.writeFileSync(path.join(DATA_DIR, 'apps', app.id, 'config.json'), JSON.stringify(secondAppConfig));

    // act
    const result = getAppInfo(app.id, app.status);

    // assert
    expect(result?.id).toEqual(secondAppConfig.id);
  });

  it('Should take config.json from repo if app is not installed', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({ status: 'missing' }, appConfig, db);
    const secondAppConfig = createAppConfig();
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', app.id, 'config.json'), JSON.stringify(secondAppConfig));

    // act
    const result = getAppInfo(app.id, app.status);

    // assert
    expect(result?.id).toEqual(secondAppConfig.id);
  });

  it('Should return null if app is not available', async () => {
    // arrange
    const appConfig = createAppConfig({ available: false });
    const app = await insertApp({}, appConfig, db);

    // act
    const result = getAppInfo(app.id, app.status);

    // assert
    expect(result).toBeNull();
  });

  it('Should return null if app does not exist', async () => {
    // arrange
    const app = getAppInfo(faker.lorem.word());

    // assert
    expect(app).toBeNull();
  });
});

describe('Test: getUpdateInfo()', () => {
  it('Should return update info', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({}, appConfig, db);

    // act
    const updateInfo = getUpdateInfo(app.id);

    // assert
    expect(updateInfo?.latestVersion).toBe(app.version);
  });

  it('Should return default values if app is not installed', async () => {
    // arrange
    const updateInfo = getUpdateInfo(faker.lorem.word());

    // assert
    expect(updateInfo).toEqual({ latestVersion: 0, latestDockerVersion: '0.0.0' });
  });

  it('Should return default values if config.json is invalid', async () => {
    // arrange
    const appConfig = createAppConfig();
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig.id, 'config.json'), 'invalid json');

    // act
    const updateInfo = getUpdateInfo(appConfig.id);

    // assert
    expect(updateInfo).toEqual({ latestVersion: 0, latestDockerVersion: '0.0.0' });
  });
});
