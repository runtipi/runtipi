import { faker } from '@faker-js/faker';
import fs from 'fs-extra';
import { getConfig, setConfig, TipiConfig } from '.';
import { readJsonFile } from '../../common/fs.helpers';

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  // @ts-expect-error - We are mocking fs
  fs.__resetAllMocks();
  jest.mock('fs-extra');
});

describe('Test: getConfig', () => {
  it('It should return config from .env', () => {
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBe('test');
    expect(config.dnsIp).toBe('9.9.9.9');
    expect(config.rootFolder).toBe('/runtipi');
    expect(config.internalIp).toBe('localhost');
  });

  it('It should overrides config from settings.json file', () => {
    const settingsJson = {
      appsRepoUrl: faker.internet.url(),
      appsRepoId: faker.random.word(),
      domain: faker.random.word(),
    };

    const MockFiles = {
      '/runtipi/state/settings.json': JSON.stringify(settingsJson),
    };

    // @ts-expect-error - We are mocking fs
    fs.__createMockFiles(MockFiles);

    const config = new TipiConfig().getConfig();

    expect(config).toBeDefined();

    expect(config.appsRepoUrl).toBe(settingsJson.appsRepoUrl);
    expect(config.appsRepoId).toBe(settingsJson.appsRepoId);
    expect(config.domain).toBe(settingsJson.domain);
  });

  it('Should not be able to apply an invalid value from json config', () => {
    const settingsJson = {
      appsRepoUrl: faker.random.word(),
      appsRepoId: faker.random.word(),
      domain: 10,
    };

    const MockFiles = {
      '/runtipi/state/settings.json': JSON.stringify(settingsJson),
    };

    // @ts-expect-error - We are mocking fs
    fs.__createMockFiles(MockFiles);

    expect(() => new TipiConfig().getConfig()).toThrow();
  });
});

describe('Test: setConfig', () => {
  it('It should be able set config', () => {
    const randomWord = faker.internet.url();
    setConfig('appsRepoUrl', randomWord);
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(randomWord);
  });

  it('Should not be able to set invalid NODE_ENV', async () => {
    // arrange
    let error;

    // act
    try {
      // @ts-expect-error - We are testing invalid NODE_ENV
      await setConfig('NODE_ENV', 'invalid');
    } catch (e) {
      error = e;
    }

    // assert
    expect(error).toBeDefined();
  });

  it('Should write config to json file', () => {
    const randomWord = faker.internet.url();
    setConfig('appsRepoUrl', randomWord, true);
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(randomWord);

    const settingsJson = readJsonFile('/runtipi/state/settings.json') as { [key: string]: string };

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
    const MockFiles = { '/runtipi/state/settings.json': JSON.stringify(fakeSettings) };
    // @ts-expect-error - We are mocking fs
    fs.__createMockFiles(MockFiles);

    // act
    const settings = new TipiConfig().getSettings();

    // assert
    expect(settings).toBeDefined();
    expect(settings.appsRepoUrl).toBe(fakeSettings.appsRepoUrl);
  });

  it('It should return current config if settings.json has any invalid value', () => {
    // arrange
    const tipiConf = new TipiConfig();
    const MockFiles = { '/runtipi/state/settings.json': JSON.stringify({ appsRepoUrl: 10 }) };
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
  it('should write settings to json file', () => {
    // arrange
    const fakeSettings = {
      appsRepoUrl: faker.internet.url(),
    };

    // act
    new TipiConfig().setSettings(fakeSettings);

    // assert
    const settingsJson = readJsonFile('/runtipi/state/settings.json') as { [key: string]: string };

    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).toBe(fakeSettings.appsRepoUrl);
  });

  it('should not write settings to json file if there are invalid values', () => {
    // arrange
    const fakeSettings = { appsRepoUrl: 10 };

    // act
    new TipiConfig().setSettings(fakeSettings as object);

    // assert
    const settingsJson = (readJsonFile('/runtipi/state/settings.json') || {}) as { [key: string]: string };

    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).not.toBe(fakeSettings.appsRepoUrl);
  });
});
