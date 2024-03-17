import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '@/config/constants';
import { TipiConfigClass } from './TipiConfig';
import { readJsonFile } from '../../common/fs.helpers';

describe('Test: getConfig', () => {
  it('It should return config from .env', () => {
    // arrange
    const config = new TipiConfigClass().getConfig();

    // assert
    expect(config).toBeDefined();
    expect(config.internalIp).toBe('localhost');
  });

  it('It should overrides config from settings.json file', () => {
    // arrange
    const settingsJson = {
      appsRepoUrl: faker.internet.url(),
      domain: faker.lorem.word(),
    };
    const MockFiles = {
      '/data/state/settings.json': JSON.stringify(settingsJson),
    };
    // @ts-expect-error - We are mocking fs
    fs.__createMockFiles(MockFiles);

    // act
    const config = new TipiConfigClass(0).getConfig();

    // assert
    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(settingsJson.appsRepoUrl);
    expect(config.domain).toBe(settingsJson.domain);
  });
});

describe('Test: setConfig', () => {
  it('It should be able set config', () => {
    // arrange
    const randomWord = faker.internet.url();

    // act
    const tipiConfig = new TipiConfigClass(0);
    tipiConfig.setConfig('appsRepoUrl', randomWord);
    const config = tipiConfig.getConfig();

    // assert
    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(randomWord);
  });

  it('Should not be able to set invalid NODE_ENV', async () => {
    // arrange
    let error;

    // act
    try {
      // @ts-expect-error - We are testing invalid NODE_ENV
      await new TipiConfigClass(0).setConfig('NODE_ENV', 'invalid');
    } catch (e) {
      error = e;
    }

    // assert
    expect(error).toBeDefined();
  });

  it('Should write config to json file', async () => {
    const randomWord = faker.internet.url();
    await new TipiConfigClass(0).setConfig('appsRepoUrl', randomWord, true);
    const config = new TipiConfigClass(0).getConfig();

    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(randomWord);

    const settingsJson = (await readJsonFile(path.join(DATA_DIR, 'state', 'settings.json'))) as { [key: string]: string };

    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).toBe(randomWord);
  });
});

describe('Test: getSettings', () => {
  it('It should return settings from settings.json', () => {
    // arrange
    const fakeSettings = {
      appsRepoUrl: faker.internet.url(),
    };
    const MockFiles = { '/data/state/settings.json': JSON.stringify(fakeSettings) };
    // @ts-expect-error - We are mocking fs
    fs.__createMockFiles(MockFiles);

    // act
    const settings = new TipiConfigClass(0).getSettings();

    // assert
    expect(settings).toBeDefined();
    expect(settings.appsRepoUrl).toBe(fakeSettings.appsRepoUrl);
  });

  it('It should return current config if settings.json has any invalid value', () => {
    // arrange
    const tipiConf = new TipiConfigClass(0);
    const MockFiles = { '/data/state/settings.json': JSON.stringify({ appsRepoUrl: 10 }) };
    // @ts-expect-error - We are mocking fs
    fs.__createMockFiles(MockFiles);

    // act
    const settings = tipiConf.getSettings();

    // assert
    expect(settings).toBeDefined();
    expect(settings.appsRepoUrl).not.toBe(10);
    expect(settings.appsRepoUrl).toBe(tipiConf.getConfig().appsRepoUrl);
  });
});

describe('Test: setSettings', () => {
  it('should write settings to json file', async () => {
    // arrange
    const fakeSettings = {
      appsRepoUrl: faker.internet.url(),
    };

    // act
    await new TipiConfigClass(0).setSettings(fakeSettings);
    const settingsJson = (await readJsonFile('/data/state/settings.json')) as { [key: string]: string };

    // assert
    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).toBe(fakeSettings.appsRepoUrl);
  });

  it('should not write settings to json file if there are invalid values', async () => {
    // arrange
    const fakeSettings = { appsRepoUrl: 10 };

    // act
    new TipiConfigClass(0).setSettings(fakeSettings as object);
    const settingsJson = (await (readJsonFile('/data/state/settings.json') || {})) as { [key: string]: string };

    // assert
    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).not.toBe(fakeSettings.appsRepoUrl);
  });

  it('should throw and error if demo mode is enabled', async () => {
    // arrange
    let error;
    const fakeSettings = { appsRepoUrl: faker.internet.url() };
    const tipiConf = new TipiConfigClass(0);
    tipiConf.setConfig('demoMode', true);

    // act
    try {
      await tipiConf.setSettings(fakeSettings);
    } catch (e) {
      error = e;
    }

    // assert
    expect(error).toBeDefined();
  });

  it('should replace empty string with undefined if storagePath is empty', async () => {
    // arrange
    const fakeSettings = { storagePath: '' };
    const tipiConf = new TipiConfigClass(0);

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBeUndefined();
  });

  it('should trim storagePath if it is not empty', async () => {
    // arrange
    const fakeSettings = { storagePath: ' /tmp ' };
    const tipiConf = new TipiConfigClass(0);

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBe('/tmp');
  });

  it('should trim storagePath and return undefined if it is empty', async () => {
    // arrange
    const fakeSettings = { storagePath: '   ' };
    const tipiConf = new TipiConfigClass();

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBeUndefined();
  });

  it('should remove all whitespaces from storagePath', async () => {
    // arrange
    const fakeSettings = { storagePath: ' /tmp /test ' };
    const tipiConf = new TipiConfigClass();

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBe('/tmp/test');
  });
});
