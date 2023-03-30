import { faker } from '@faker-js/faker';
import fs from 'fs-extra';
import { getConfig, setConfig, getSettings, setSettings, TipiConfig } from '.';
import { readJsonFile } from '../../common/fs.helpers';

beforeEach(async () => {
  // @ts-expect-error - We are mocking fs
  fs.__resetAllMocks();
  jest.mock('fs-extra');
});

jest.mock('next/config', () =>
  jest.fn(() => ({
    serverRuntimeConfig: {
      DNS_IP: '1.1.1.1',
    },
  })),
);

// eslint-disable-next-line
import nextConfig from 'next/config';

describe('Test: process.env', () => {
  it('should return config from .env', () => {
    const config = new TipiConfig().getConfig();

    expect(config).toBeDefined();
    expect(config.dnsIp).toBe('1.1.1.1');
  });

  it('should throw an error if there are invalid values', () => {
    // @ts-expect-error - We are mocking next/config
    nextConfig.mockImplementationOnce(() => ({
      serverRuntimeConfig: {
        DNS_IP: 'invalid',
      },
    }));

    expect(() => new TipiConfig().getConfig()).toThrow();
  });
});

describe('Test: getConfig', () => {
  it('It should return config from .env', () => {
    // arrange
    const config = getConfig();

    // assert
    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBe('test');
    expect(config.rootFolder).toBe('/runtipi');
    expect(config.internalIp).toBe('localhost');
  });

  it('It should overrides config from settings.json file', () => {
    // arrange
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

    // act
    const config = new TipiConfig().getConfig();

    // assert
    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(settingsJson.appsRepoUrl);
    expect(config.appsRepoId).toBe(settingsJson.appsRepoId);
    expect(config.domain).toBe(settingsJson.domain);
  });

  it('Should not be able to apply an invalid value from json config', () => {
    // arrange
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

    // act & assert
    expect(() => new TipiConfig().getConfig()).toThrow();
  });
});

describe('Test: setConfig', () => {
  it('It should be able set config', () => {
    // arrange
    const randomWord = faker.internet.url();

    // act
    setConfig('appsRepoUrl', randomWord);
    const config = getConfig();

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
    const settings = getSettings();

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
    setSettings(fakeSettings);
    const settingsJson = readJsonFile('/runtipi/state/settings.json') as { [key: string]: string };

    // assert
    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).toBe(fakeSettings.appsRepoUrl);
  });

  it('should not write settings to json file if there are invalid values', () => {
    // arrange
    const fakeSettings = { appsRepoUrl: 10 };

    // act
    setSettings(fakeSettings as object);
    const settingsJson = (readJsonFile('/runtipi/state/settings.json') || {}) as { [key: string]: string };

    // assert
    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).not.toBe(fakeSettings.appsRepoUrl);
  });

  it('should throw and error if demo mode is enabled', async () => {
    // arrange
    let error;
    const fakeSettings = { appsRepoUrl: faker.internet.url() };
    const tipiConf = new TipiConfig();
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
    const tipiConf = new TipiConfig();

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBeUndefined();
  });

  it('should trim storagePath if it is not empty', async () => {
    // arrange
    const fakeSettings = { storagePath: ' /tmp ' };
    const tipiConf = new TipiConfig();

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBe('/tmp');
  });

  it('should trim storagePath and return undefined if it is empty', async () => {
    // arrange
    const fakeSettings = { storagePath: '   ' };
    const tipiConf = new TipiConfig();

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBeUndefined();
  });

  it('should remove all whitespaces from storagePath', async () => {
    // arrange
    const fakeSettings = { storagePath: ' /tmp /test ' };
    const tipiConf = new TipiConfig();

    // act
    await tipiConf.setSettings(fakeSettings);

    // assert
    expect(tipiConf.getConfig().storagePath).toBe('/tmp/test');
  });
});
