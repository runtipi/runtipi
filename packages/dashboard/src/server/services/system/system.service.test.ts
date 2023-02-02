import fs from 'fs-extra';
import semver from 'semver';
import { faker } from '@faker-js/faker';
import { SystemService } from '.';
import { EventDispatcher } from '../../core/EventDispatcher';
import { setConfig } from '../../core/TipiConfig';
import TipiCache from '../../core/TipiCache';

jest.mock('axios');
jest.mock('redis');

beforeEach(async () => {
  jest.mock('fs-extra');
  jest.resetModules();
  jest.resetAllMocks();
});

describe('Test: systemInfo', () => {
  it('Should throw if system-info.json does not exist', () => {
    try {
      SystemService.systemInfo();
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e).toBeDefined();
        expect(e.message).toBe('Error parsing system info');
      } else {
        expect(true).toBe(false);
      }
    }
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
    const systemInfo = SystemService.systemInfo();

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

  it('It should return version', async () => {
    // Arrange
    // @ts-expect-error Mocking fetch
    fetch.mockImplementationOnce(() => Promise.resolve({ json: () => Promise.resolve({ name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}` }) }));

    // Act
    const version = await SystemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(semver.valid(version.latest)).toBeTruthy();
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
    await expect(SystemService.update()).rejects.toThrow('Could not get latest version');
  });

  it('Should throw if current version is higher than latest', async () => {
    // Arrange
    setConfig('version', '0.0.2');
    TipiCache.set('latestVersion', '0.0.1');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('Current version is newer than latest version');
  });

  it('Should throw if current version is equal to latest', async () => {
    // Arrange
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.1');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('Current version is already up to date');
  });

  it('Should throw an error if there is a major version difference', async () => {
    // Arrange
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '1.0.0');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('The major version has changed. Please update manually');
  });
});
