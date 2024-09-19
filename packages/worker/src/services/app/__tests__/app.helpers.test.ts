import fs from 'node:fs';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { createAppConfig } from '@/tests/apps.factory';
import { faker } from '@faker-js/faker';
import { pathExists } from '@runtipi/shared/node';
import { describe, expect, it } from 'vitest';
import { generateEnvFile } from '../app.helpers';
import { getAppEnvMap } from '../env.helpers';

describe('app helpers', () => {
  describe('Test: generateEnvFile()', () => {
    it('should generate an env file', async () => {
      // arrange
      const appConfig = createAppConfig({
        form_fields: [{ env_variable: 'TEST_FIELD', type: 'text', label: 'test', required: true }],
      });
      const fakevalue = faker.string.alphanumeric(10);

      // act
      await generateEnvFile(appConfig.id, { TEST_FIELD: fakevalue });
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('TEST_FIELD')).toBe(fakevalue);
      expect(envmap.get('APP_PORT')).toBe(String(appConfig.port));
      expect(envmap.get('APP_ID')).toBe(appConfig.id);
      expect(envmap.get('ROOT_FOLDER_HOST')).toBe(process.env.ROOT_FOLDER_HOST);
      expect(envmap.get('APP_DATA_DIR')).toBe(`${process.env.RUNTIPI_APP_DATA_PATH}/app-data/${appConfig.id}`);
      expect(envmap.get('APP_DOMAIN')).toBe(`localhost:${appConfig.port}`);
      expect(envmap.get('APP_HOST')).toBe('localhost');
      expect(envmap.get('APP_PROTOCOL')).toBe('http');
    });

    it('should throw an error if the app has an invalid config.json file', async () => {
      // arrange
      const appConfig = createAppConfig();
      await fs.promises.writeFile(`${DATA_DIR}/apps/${appConfig.id}/config.json`, '{}');

      // act & assert
      await expect(generateEnvFile(appConfig.id, {})).rejects.toThrowError(`App ${appConfig.id} has invalid config.json file`);
    });

    it('Should automatically generate value for random field', async () => {
      // arrange
      const appConfig = createAppConfig({
        form_fields: [
          {
            env_variable: 'RANDOM_FIELD',
            type: 'random',
            label: 'test',
            min: 32,
            max: 32,
            required: true,
          },
        ],
      });

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('RANDOM_FIELD')).toBeDefined();
      expect(envmap.get('RANDOM_FIELD')).toHaveLength(32);
    });

    it('Should not re-generate random field if it already exists', async () => {
      // arrange
      const appConfig = createAppConfig({
        form_fields: [
          {
            env_variable: 'RANDOM_FIELD',
            type: 'random',
            label: 'test',
            min: 32,
            max: 32,
            required: true,
          },
        ],
      });
      const randomField = faker.string.alphanumeric(32);
      await fs.promises.mkdir(`${APP_DATA_DIR}/${appConfig.id}`, { recursive: true });
      await fs.promises.writeFile(`${APP_DATA_DIR}/${appConfig.id}/app.env`, `RANDOM_FIELD=${randomField}`);

      // act
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('RANDOM_FIELD')).toBe(randomField);
    });

    it('Should throw an error if required field is not provided', async () => {
      // arrange
      const appConfig = createAppConfig({
        form_fields: [{ env_variable: 'TEST_FIELD', type: 'text', label: 'test', required: true }],
      });

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
      await fs.promises.mkdir(`${APP_DATA_DIR}/${appConfig.id}`, { recursive: true });

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
      await fs.promises.mkdir(`${APP_DATA_DIR}/${appConfig.id}`, { recursive: true });
      await fs.promises.writeFile(
        `${APP_DATA_DIR}/${appConfig.id}/app.env`,
        `VAPID_PRIVATE_KEY=${vapidPrivateKey}\nVAPID_PUBLIC_KEY=${vapidPublicKey}`,
      );
      await generateEnvFile(appConfig.id, {});
      const envmap = await getAppEnvMap(appConfig.id);

      // assert
      expect(envmap.get('VAPID_PRIVATE_KEY')).toBe(vapidPrivateKey);
      expect(envmap.get('VAPID_PUBLIC_KEY')).toBe(vapidPublicKey);
    });
  });
});
