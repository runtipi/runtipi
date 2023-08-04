import fs from 'fs';
import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { copyDataDir, generateEnvFile } from '../app.helpers';
import { createAppConfig } from '@/tests/apps.factory';
import { getAppEnvMap } from '../env.helpers';
import { getEnv } from '@/utils/environment/environment';
import { pathExists } from '@/utils/fs-helpers';

const { rootFolderHost, storagePath } = getEnv();

describe('app helpers', () => {
  describe('Test: generateEnvFile()', () => {
    it('should throw an error if the app has an invalid config.json file', async () => {
      // arrange
      const appConfig = createAppConfig();
      await fs.promises.writeFile(`${rootFolderHost}/apps/${appConfig.id}/config.json`, '{}');

      // act & assert
      expect(generateEnvFile(appConfig.id, {})).rejects.toThrowError(`App ${appConfig.id} has invalid config.json file`);
    });

    it('Should generate an env file', async () => {
      // arrange
      const appConfig = createAppConfig({ form_fields: [{ env_variable: 'TEST_FIELD', type: 'text', label: 'test', required: true }] });
      const fakevalue = faker.string.alphanumeric(10);

      // act
      await generateEnvFile(appConfig.id, { TEST_FIELD: fakevalue });
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('TEST_FIELD')).toBe(fakevalue);
    });

    it('Should automatically generate value for random field', async () => {
      // arrange
      const appConfig = createAppConfig({ form_fields: [{ env_variable: 'RANDOM_FIELD', type: 'random', label: 'test', min: 32, max: 32, required: true }] });

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('RANDOM_FIELD')).toBeDefined();
      expect(envmap.get('RANDOM_FIELD')).toHaveLength(32);
    });

    it('Should not re-generate random field if it already exists', async () => {
      // arrange
      const appConfig = createAppConfig({ form_fields: [{ env_variable: 'RANDOM_FIELD', type: 'random', label: 'test', min: 32, max: 32, required: true }] });
      const randomField = faker.string.alphanumeric(32);
      await fs.promises.mkdir(`${rootFolderHost}/app-data/${appConfig.id}`, { recursive: true });
      await fs.promises.writeFile(`${rootFolderHost}/app-data/${appConfig.id}/app.env`, `RANDOM_FIELD=${randomField}`);

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('RANDOM_FIELD')).toBe(randomField);
    });

    it('Should throw an error if required field is not provided', async () => {
      // arrange
      const appConfig = createAppConfig({ form_fields: [{ env_variable: 'TEST_FIELD', type: 'text', label: 'test', required: true }] });

      // act & assert
      await expect(generateEnvFile(appConfig.id, {})).rejects.toThrowError();
    });

    it('Should throw an error if app does not exist', async () => {
      // act & assert
      await expect(generateEnvFile('non-existing-app', {})).rejects.toThrowError();
    });

    it('Should add APP_EXPOSED to env file if domain is provided and app is exposed', async () => {
      // arrange
      const domain = faker.internet.domainName();
      const appConfig = createAppConfig({});

      // act
      await generateEnvFile(appConfig.id, { domain, exposed: true });
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('APP_EXPOSED')).toBe('true');
      expect(envmap.get('APP_DOMAIN')).toBe(domain);
    });

    it('Should not add APP_EXPOSED if domain is not provided', async () => {
      // arrange
      const appConfig = createAppConfig({});

      // act
      await generateEnvFile(appConfig.id, { exposed: true });
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('APP_EXPOSED')).toBeUndefined();
    });

    it('Should not add APP_EXPOSED if app is not exposed', async () => {
      // arrange
      const domain = faker.internet.domainName();
      const appConfig = createAppConfig({});

      // act
      await generateEnvFile(appConfig.id, { domain });
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('APP_EXPOSED')).toBeUndefined();
      expect(envmap.get('APP_DOMAIN')).toBe(`localhost:${appConfig.port}`);
    });

    it('Should not re-create app-data folder if it already exists', async () => {
      // arrange
      const appConfig = createAppConfig({});
      await fs.promises.mkdir(`${rootFolderHost}/app-data/${appConfig.id}`, { recursive: true });

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('APP_EXPOSED')).toBeUndefined();
    });

    it('should generate vapid private and public keys if config has generate_vapid_keys set to true', async () => {
      // arrange
      const appConfig = createAppConfig({ generate_vapid_keys: true });

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('VAPID_PRIVATE_KEY')).toBeDefined();
      expect(envmap.get('VAPID_PUBLIC_KEY')).toBeDefined();
    });

    it('should not generate vapid private and public keys if config has generate_vapid_keys set to false', async () => {
      // arrange
      const appConfig = createAppConfig({ generate_vapid_keys: false });

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('VAPID_PRIVATE_KEY')).toBeUndefined();
      expect(envmap.get('VAPID_PUBLIC_KEY')).toBeUndefined();
    });

    it('should not re-generate vapid private and public keys if they already exist', async () => {
      // arrange
      const appConfig = createAppConfig({ generate_vapid_keys: true });

      const vapidPrivateKey = faker.string.alphanumeric(32);
      const vapidPublicKey = faker.string.alphanumeric(32);

      // act
      await fs.promises.mkdir(`${rootFolderHost}/app-data/${appConfig.id}`, { recursive: true });
      await fs.promises.writeFile(`${rootFolderHost}/app-data/${appConfig.id}/app.env`, `VAPID_PRIVATE_KEY=${vapidPrivateKey}\nVAPID_PUBLIC_KEY=${vapidPublicKey}`);
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('VAPID_PRIVATE_KEY')).toBe(vapidPrivateKey);
      expect(envmap.get('VAPID_PUBLIC_KEY')).toBe(vapidPublicKey);
    });
  });

  describe('Test: copyDataDir()', () => {
    it('should do nothing if app does not have a data dir', async () => {
      // arrange
      const appConfig = createAppConfig({});

      // act
      await copyDataDir(appConfig.id);

      // assert
      expect(await pathExists(`${rootFolderHost}/apps/${appConfig.id}/data`)).toBe(false);
    });

    it('should copy data dir to app-data folder', async () => {
      // arrange
      const appConfig = createAppConfig({});
      const dataDir = `${rootFolderHost}/apps/${appConfig.id}/data`;

      await fs.promises.mkdir(dataDir, { recursive: true });
      await fs.promises.writeFile(`${dataDir}/test.txt`, 'test');

      // act
      await copyDataDir(appConfig.id);

      // assert
      const appDataDir = `${storagePath}/app-data/${appConfig.id}`;
      expect(await fs.promises.readFile(`${appDataDir}/data/test.txt`, 'utf8')).toBe('test');
    });

    it('should copy folders recursively', async () => {
      // arrange
      const appConfig = createAppConfig({});
      const dataDir = `${rootFolderHost}/apps/${appConfig.id}/data`;

      await fs.promises.mkdir(dataDir, { recursive: true });

      const subDir = `${dataDir}/subdir/subsubdir`;
      await fs.promises.mkdir(subDir, { recursive: true });

      await fs.promises.writeFile(`${subDir}/test.txt`, 'test');
      await fs.promises.writeFile(`${dataDir}/test.txt`, 'test');

      // act
      await copyDataDir(appConfig.id);

      // assert
      const appDataDir = `${storagePath}/app-data/${appConfig.id}`;
      expect(await fs.promises.readFile(`${appDataDir}/data/subdir/subsubdir/test.txt`, 'utf8')).toBe('test');
      expect(await fs.promises.readFile(`${appDataDir}/data/test.txt`, 'utf8')).toBe('test');
    });

    it('should replace the content of .template files with the content of the app.env file', async () => {
      // arrange
      const appConfig = createAppConfig({});
      const dataDir = `${rootFolderHost}/apps/${appConfig.id}/data`;
      const appDataDir = `${storagePath}/app-data/${appConfig.id}`;

      await fs.promises.mkdir(dataDir, { recursive: true });
      await fs.promises.mkdir(appDataDir, { recursive: true });
      await fs.promises.writeFile(`${dataDir}/test.txt.template`, '{{TEST_VAR}}');
      await fs.promises.writeFile(`${appDataDir}/app.env`, 'TEST_VAR=test');

      // act
      await copyDataDir(appConfig.id);

      // assert
      expect(await fs.promises.readFile(`${appDataDir}/data/test.txt`, 'utf8')).toBe('test');
    });
  });
});
