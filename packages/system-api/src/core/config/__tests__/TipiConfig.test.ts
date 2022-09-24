import { faker } from '@faker-js/faker';
import fs from 'fs-extra';
import { readJsonFile } from '../../../modules/fs/fs.helpers';
import { applyJsonConfig, getConfig, setConfig } from '../TipiConfig';

jest.mock('fs-extra');

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('Test: getConfig', () => {
  it('It should return config from .env', () => {
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBe('test');
    expect(config.logs.LOGS_FOLDER).toBe('logs');
    expect(config.logs.LOGS_APP).toBe('app.log');
    expect(config.logs.LOGS_ERROR).toBe('error.log');
    expect(config.dnsIp).toBe('9.9.9.9');
    expect(config.rootFolder).toBe('/runtipi');
    expect(config.internalIp).toBe('192.168.1.10');
  });
});

describe('Test: setConfig', () => {
  it('It should be able set config', () => {
    const randomWord = faker.random.word();
    setConfig('appsRepoUrl', randomWord);
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(randomWord);
  });

  it('Should not be able to set invalid NODE_ENV', () => {
    // @ts-ignore
    expect(() => setConfig('NODE_ENV', 'invalid')).toThrow();
  });

  it('Should write config to json file', () => {
    const randomWord = faker.random.word();
    setConfig('appsRepoUrl', randomWord, true);
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.appsRepoUrl).toBe(randomWord);

    const settingsJson = readJsonFile('/state/settings.json');

    expect(settingsJson).toBeDefined();
    expect(settingsJson.appsRepoUrl).toBe(randomWord);
  });
});

describe('Test: applyJsonConfig', () => {
  it('It should be able to apply json config', () => {
    const settingsJson = {
      appsRepoUrl: faker.random.word(),
      appsRepoId: faker.random.word(),
      domain: faker.random.word(),
    };

    const MockFiles = {
      '/runtipi/state/settings.json': JSON.stringify(settingsJson),
    };

    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    applyJsonConfig();
    const config = getConfig();

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

    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    expect(() => applyJsonConfig()).toThrow();
  });
});
