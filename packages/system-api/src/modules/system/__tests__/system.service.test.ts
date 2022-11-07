import fs from 'fs-extra';
import semver from 'semver';
import axios from 'axios';
import { faker } from '@faker-js/faker';
import SystemService from '../system.service';
import TipiCache from '../../../config/TipiCache';
import { setConfig } from '../../../core/config/TipiConfig';
import logger from '../../../config/logger/logger';
import EventDispatcher from '../../../core/config/EventDispatcher';

jest.mock('fs-extra');
jest.mock('axios');
jest.mock('redis');

beforeEach(async () => {
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
        fail('Should throw an error');
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

    // @ts-ignore
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
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}` },
    });

    // Act
    const version = await SystemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(semver.valid(version.latest)).toBeTruthy();

    spy.mockRestore();
  });

  it('Should return undefined for latest if request fails', async () => {
    jest.spyOn(axios, 'get').mockImplementation(() => {
      throw new Error('Error');
    });

    const version = await SystemService.getVersion();

    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(version.latest).toBeUndefined();
  });

  it('Should return cached version', async () => {
    // Arrange
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}` },
    });

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

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe('Test: restart', () => {
  it('Should return true', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });

    // Act
    const restart = await SystemService.restart();

    // Assert
    expect(restart).toBeTruthy();
  });

  it('Should log error if fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'fake' });
    const log = jest.spyOn(logger, 'error');

    // Act
    const restart = await SystemService.restart();

    // Assert
    expect(restart).toBeFalsy();
    expect(log).toHaveBeenCalledWith('Error restarting system: fake');
    log.mockRestore();
  });
});

describe('Test: update', () => {
  it('Should return true', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });
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
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: null },
    });
    setConfig('version', '0.0.1');

    // Act & Assert
    await expect(SystemService.update()).rejects.toThrow('Could not get latest version');
    spy.mockRestore();
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

  it('Should log error if fails', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: false, stdout: 'fake2' });
    const log = jest.spyOn(logger, 'error');

    // Act
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.2');
    const update = await SystemService.update();

    // Assert
    expect(update).toBeFalsy();
    expect(log).toHaveBeenCalledWith('Error updating system: fake2');
    log.mockRestore();
  });
});
