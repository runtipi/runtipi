import fs from 'fs-extra';
import { fromAny, fromPartial } from '@total-typescript/shoehorn';
import { faker } from '@faker-js/faker';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { getAppEnvMap } from '@/server/utils/env-generation';
import { setConfig } from '../../core/TipiConfig';
import { appInfoSchema, checkAppRequirements, checkEnvFile, ensureAppFolder, generateEnvFile, getAppInfo, getAvailableApps, getUpdateInfo } from './apps.helpers';
import { createAppConfig, insertApp } from '../../tests/apps.factory';

let db: TestDatabase;
const TEST_SUITE = 'appshelpers';
jest.mock('fs-extra');

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
    setConfig('architecture', 'arm64');
    const appConfig = createAppConfig({ supported_architectures: ['arm'] });

    // assert
    expect(() => checkAppRequirements(appConfig.id)).toThrowError(`App ${appConfig.id} is not supported on this architecture`);
  });
});

describe('Test: checkEnvFile()', () => {
  it('Should not throw if all required fields are present', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({}, appConfig, db);

    // act
    await checkEnvFile(app.id);
  });

  it('Should throw if a required field is missing', async () => {
    // arrange
    const fieldName = faker.lorem.word().toUpperCase();
    const appConfig = createAppConfig({ form_fields: [{ env_variable: fieldName, type: 'text', label: 'test', required: true }] });
    const app = await insertApp({}, appConfig, db);
    const newAppEnv = 'APP_PORT=test\n';
    fs.writeFileSync(`/app/storage/app-data/${app.id}/app.env`, newAppEnv);

    // act & assert
    await expect(checkEnvFile(app.id)).rejects.toThrowError('New info needed. App config needs to be updated');
  });

  it('Should throw if config.json is incorrect', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({}, appConfig, db);
    fs.writeFileSync(`/runtipi/apps/${app.id}/config.json`, 'invalid json');

    // act & assert
    await expect(checkEnvFile(app.id)).rejects.toThrowError(`App ${app.id} has invalid config.json file`);
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

describe('Test: generateEnvFile()', () => {
  it('Should generate an env file', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ env_variable: 'TEST_FIELD', type: 'text', label: 'test', required: true }] });
    const app = await insertApp({}, appConfig, db);
    const fakevalue = faker.string.alphanumeric(10);

    // act
    await generateEnvFile(Object.assign(app, { config: { TEST_FIELD: fakevalue } }));
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('TEST_FIELD')).toBe(fakevalue);
  });

  it('Should automatically generate value for random field', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ env_variable: 'RANDOM_FIELD', type: 'random', label: 'test', min: 32, max: 32, required: true }] });
    const app = await insertApp({}, appConfig, db);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('RANDOM_FIELD')).toBeDefined();
    expect(envmap.get('RANDOM_FIELD')).toHaveLength(32);
  });

  it('Should not re-generate random field if it already exists', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ env_variable: 'RANDOM_FIELD', type: 'random', label: 'test', min: 32, max: 32, required: true }] });
    const app = await insertApp({}, appConfig, db);
    const randomField = faker.string.alphanumeric(32);
    fs.writeFileSync(`/app/storage/app-data/${app.id}/app.env`, `RANDOM_FIELD=${randomField}`);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('RANDOM_FIELD')).toBe(randomField);
  });

  it('Should throw an error if required field is not provided', async () => {
    // arrange
    const appConfig = createAppConfig({ form_fields: [{ env_variable: 'TEST_FIELD', type: 'text', label: 'test', required: true }] });
    const app = await insertApp({}, appConfig, db);

    // act & assert
    await expect(generateEnvFile(Object.assign(app, { config: { TEST_FIELD: undefined } }))).rejects.toThrowError('Variable test is required');
  });

  it('Should throw an error if app does not exist', async () => {
    // act & assert
    await expect(generateEnvFile(fromPartial({ id: 'not-existing-app' }))).rejects.toThrowError('App not-existing-app has invalid config.json file');
  });

  it('Should add APP_EXPOSED to env file if domain is provided and app is exposed', async () => {
    // arrange
    const domain = faker.internet.domainName();
    const appConfig = createAppConfig();
    const app = await insertApp({ domain, exposed: true }, appConfig, db);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('APP_EXPOSED')).toBe('true');
    expect(envmap.get('APP_DOMAIN')).toBe(domain);
  });

  it('Should not add APP_EXPOSED if domain is not provided', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({ exposed: true }, appConfig, db);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('APP_EXPOSED')).toBeUndefined();
  });

  it('Should not add APP_EXPOSED if app is not exposed', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({ exposed: false, domain: faker.internet.domainName() }, appConfig, db);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('APP_EXPOSED')).toBeUndefined();
    expect(envmap.get('APP_DOMAIN')).toBe(`localhost:${appConfig.port}`);
  });

  it('Should create app folder if it does not exist', async () => {
    // arrange
    const appConfig = createAppConfig();
    const app = await insertApp({}, appConfig, db);
    fs.rmSync(`/app/storage/app-data/${app.id}`, { recursive: true });

    // act
    await generateEnvFile(app);

    // assert
    expect(fs.existsSync(`/app/storage/app-data/${app.id}`)).toBe(true);
  });

  it('should generate vapid private and public keys if config has generate_vapid_keys set to true', async () => {
    // arrange
    const appConfig = createAppConfig({ generate_vapid_keys: true });
    const app = await insertApp({}, appConfig, db);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('VAPID_PRIVATE_KEY')).toBeDefined();
    expect(envmap.get('VAPID_PUBLIC_KEY')).toBeDefined();
  });

  it('should not generate vapid private and public keys if config has generate_vapid_keys set to false', async () => {
    // arrange
    const appConfig = createAppConfig({ generate_vapid_keys: false });
    const app = await insertApp({}, appConfig, db);

    // act
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('VAPID_PRIVATE_KEY')).toBeUndefined();
    expect(envmap.get('VAPID_PUBLIC_KEY')).toBeUndefined();
  });

  it('should not re-generate vapid private and public keys if they already exist', async () => {
    // arrange
    const appConfig = createAppConfig({ generate_vapid_keys: true });
    const app = await insertApp({}, appConfig, db);

    const vapidPrivateKey = faker.string.alphanumeric(32);
    const vapidPublicKey = faker.string.alphanumeric(32);

    // act
    fs.writeFileSync(`/app/storage/app-data/${app.id}/app.env`, `VAPID_PRIVATE_KEY=${vapidPrivateKey}\nVAPID_PUBLIC_KEY=${vapidPublicKey}`);
    await generateEnvFile(app);
    const envmap = await getAppEnvMap(app.id);

    // assert
    expect(envmap.get('VAPID_PRIVATE_KEY')).toBe(vapidPrivateKey);
    expect(envmap.get('VAPID_PUBLIC_KEY')).toBe(vapidPublicKey);
  });
});

describe('Test: getAvailableApps()', () => {
  it('Should return all available apps', async () => {
    // arrange
    createAppConfig();
    createAppConfig();

    // act
    const availableApps = await getAvailableApps();

    // assert
    expect(availableApps.length).toBe(2);
  });

  it('Should not return apps with invalid config.json', async () => {
    // arrange
    const appConfig = createAppConfig();
    createAppConfig();
    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appConfig.id}/config.json`, 'invalid json');

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
    fs.writeFileSync(`/runtipi/apps/${app.id}/config.json`, JSON.stringify(secondAppConfig));

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
    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${app.id}/config.json`, JSON.stringify(secondAppConfig));

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

  it('Should throw if something goes wrong', async () => {
    // arrange
    jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => {
      throw new Error('Something went wrong');
    });
    const appConfig = createAppConfig();
    const app = await insertApp({ status: 'missing' }, appConfig, db);

    // act & assert
    expect(() => getAppInfo(app.id, app.status)).toThrowError(`Error loading app: ${app.id}`);
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
    fs.writeFileSync(`/runtipi/repos/repo-id/apps/${appConfig.id}/config.json`, 'invalid json');

    // act
    const updateInfo = getUpdateInfo(appConfig.id);

    // assert
    expect(updateInfo).toEqual({ latestVersion: 0, latestDockerVersion: '0.0.0' });
  });
});

describe('Test: ensureAppFolder()', () => {
  it('should copy the folder from repo', async () => {
    // arrange
    await fs.promises.mkdir('/runtipi/repos/repo-id/apps/test', { recursive: true });
    await fs.promises.writeFile('/runtipi/repos/repo-id/apps/test/test.yml', 'test');
    // act
    ensureAppFolder('test');

    // assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual(['test.yml']);
  });

  it('should not copy the folder if it already exists', async () => {
    // arrange
    await fs.promises.mkdir('/runtipi/repos/repo-id/apps/test', { recursive: true });
    await fs.promises.writeFile('/runtipi/repos/repo-id/apps/test/test.yml', 'test');
    await fs.promises.mkdir('/runtipi/apps/test', { recursive: true });
    await fs.promises.writeFile('/runtipi/apps/test/docker-compose.yml', 'test');

    // act
    ensureAppFolder('test');

    // assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual(['docker-compose.yml']);
  });

  it('Should overwrite the folder if clean up is true', async () => {
    // arrange
    await fs.promises.mkdir('/runtipi/repos/repo-id/apps/test', { recursive: true });
    await fs.promises.writeFile('/runtipi/repos/repo-id/apps/test/test.yml', 'test');
    await fs.promises.mkdir('/runtipi/apps/test', { recursive: true });
    await fs.promises.writeFile('/runtipi/apps/test/docker-compose.yml', 'test');

    // act
    ensureAppFolder('test', true);

    // assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual(['test.yml']);
  });

  it('Should delete folder if it exists but has no docker-compose.yml file', async () => {
    // arrange
    const randomFileName = `${faker.lorem.word()}.yml`;
    await fs.promises.mkdir('/runtipi/repos/repo-id/apps/test', { recursive: true });
    await fs.promises.writeFile(`/runtipi/repos/repo-id/apps/test/${randomFileName}`, 'test');
    await fs.promises.mkdir('/runtipi/apps/test', { recursive: true });
    await fs.promises.writeFile('/runtipi/apps/test/test.yml', 'test');

    // act
    ensureAppFolder('test');

    // assert
    const files = fs.readdirSync('/runtipi/apps/test');
    expect(files).toEqual([randomFileName]);
  });
});
