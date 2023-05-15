import fs from 'fs-extra';
import semver from 'semver';
import { faker } from '@faker-js/faker';
import fetch from 'node-fetch-commonjs';
import { EventDispatcher } from '../../core/EventDispatcher';
import { setConfig } from '../../core/TipiConfig';
import TipiCache from '../../core/TipiCache';
import { SystemServiceClass } from '.';

jest.mock('redis');
jest.mock('node-fetch-commonjs');

const SystemService = new SystemServiceClass();

beforeEach(async () => {
  jest.mock('fs-extra');
  jest.resetModules();
  jest.resetAllMocks();
});

describe('Test: systemInfo', () => {
  it('should return default values when system-info.json is not present', () => {
    // arrange
    const systemInfo = SystemServiceClass.systemInfo();

    // assert
    expect(systemInfo).toBeDefined();
    expect(systemInfo.cpu).toBeDefined();
    expect(systemInfo.memory).toBeDefined();
    expect(systemInfo.disk).toBeDefined();
    expect(systemInfo.cpu.load).toBe(0);
    expect(systemInfo.memory.total).toBe(0);
    expect(systemInfo.memory.used).toBe(0);
    expect(systemInfo.memory.available).toBe(0);
    expect(systemInfo.disk.total).toBe(0);
    expect(systemInfo.disk.used).toBe(0);
    expect(systemInfo.disk.available).toBe(0);
  });

  it('It should return system info', async () => {
    // Arrange
    const info = {
      cpu: { load: 0.1 },
      memory: { available: 1000, total: 2000, used: 1000 },
      disk: { available: 1000, total: 2000, used: 1000 },
    };

    const MockFiles = {
      '/runtipi/state/system-info.json': JSON.stringify(info),
    };

    // @ts-expect-error Mocking fs
    fs.__createMockFiles(MockFiles);

    // Act
    const systemInfo = SystemServiceClass.systemInfo();

    // Assert
    expect(systemInfo).toBeDefined();
    expect(systemInfo.cpu).toBeDefined();
    expect(systemInfo.memory).toBeDefined();
  });
});

describe('Test: getVersion', () => {
  beforeEach(() => {
    TipiCache.del('latestVersion');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('It should return version with body', async () => {
    // Arrange
    const body = faker.random.words(10);
    // @ts-expect-error Mocking fetch
    fetch.mockImplementationOnce(() => Promise.resolve({ json: () => Promise.resolve({ name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}`, body }) }));

    // Act
    const version = await SystemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(semver.valid(version.latest)).toBeTruthy();
    expect(version.body).toBeDefined();
  });

  it('Should return undefined for latest if request fails', async () => {
    // @ts-expect-error Mocking fetch
    fetch.mockImplementationOnce(() => Promise.reject(new Error('API is down')));

    const version = await SystemService.getVersion();

    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(version.latest).toBeUndefined();
  });

  it('Should return cached version', async () => {
    // Arrange
    // @ts-expect-error Mocking fetch
    fetch.mockImplementationOnce(() => Promise.resolve({ json: () => Promise.resolve({ name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}` }) }));

    // Act
    const version = await SystemService.getVersion();
    const version2 = await SystemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(semver.valid(version.latest)).toBeTruthy();

    expect(version2.latest).toBe(version.latest);
    expect(version2.current).toBeDefined();
    expect(semver.valid(version2.latest)).toBeTruthy();
  });
});

describe('Test: restart', () => {
  it('Should return true', async () => {
    // Arrange
    EventDispatcher.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });

    // Act
    const restart = await SystemService.restart();

    // Assert
    expect(restart).toBeTruthy();
  });

  it('should throw an error in demo mode', async () => {
    // Arrange
    await setConfig('demoMode', true);

    // Act & Assert
    await expect(SystemService.restart()).rejects.toThrow('server-messages.errors.not-allowed-in-demo');
  });
});

describe('Test: update', () => {
  it('Should return true', async () => {
    // Arrange
    EventDispatcher.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.2');

    // Act
    const update = await SystemService.update();

    // Assert
    expect(update).toBeTruthy();
  });

  it('Should throw an error if latest version is not set', async () => {
    // Arrange
    TipiCache.del('latestVersion');
    // @ts-expect-error Mocking fetch
    fetch.mockImplementationOnce(() => Promise.resolve({ json: () => Promise.resolve({ name: null }) }));
    setConfig('version', '0.0.1');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('server-messages.errors.could-not-get-latest-version');
  });

  it('Should throw if current version is higher than latest', async () => {
    // Arrange
    setConfig('version', '0.0.2');
    TipiCache.set('latestVersion', '0.0.1');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('server-messages.errors.current-version-is-latest');
  });

  it('Should throw if current version is equal to latest', async () => {
    // Arrange
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.1');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('server-messages.errors.current-version-is-latest');
  });

  it('Should throw an error if there is a major version difference', async () => {
    // Arrange
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '1.0.0');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('server-messages.errors.major-version-update');
  });
});
