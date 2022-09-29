import fs from 'fs-extra';
import semver from 'semver';
import childProcess from 'child_process';
import axios from 'axios';
import SystemService from '../system.service';
import { faker } from '@faker-js/faker';
import TipiCache from '../../../config/TipiCache';
import { setConfig } from '../../../core/config/TipiConfig';
import logger from '../../../config/logger/logger';

jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('axios');

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('Test: systemInfo', () => {
  it('Should throw if system-info.json does not exist', () => {
    try {
      SystemService.systemInfo();
    } catch (e) {
      expect(e).toBeDefined();
      // @ts-ignore
      expect(e.message).toBe('Error parsing system info');
    }
  });

  it('It should return system info', async () => {
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

    const systemInfo = SystemService.systemInfo();

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
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}` },
    });
    const version = await SystemService.getVersion();

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
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: `v${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}` },
    });
    const version = await SystemService.getVersion();

    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(semver.valid(version.latest)).toBeTruthy();

    const version2 = await SystemService.getVersion();

    expect(version2.latest).toBe(version.latest);
    expect(version2.current).toBeDefined();
    expect(semver.valid(version2.latest)).toBeTruthy();

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe('Test: restart', () => {
  it('Should return true', async () => {
    const restart = await SystemService.restart();

    expect(restart).toBeTruthy();
  });

  it('Should log error if fails', async () => {
    // @ts-ignore
    const spy = jest.spyOn(childProcess, 'execFile').mockImplementation((_path, _args, _, cb) => {
      // @ts-ignore
      if (cb) cb('error', null, null);
    });
    const log = jest.spyOn(logger, 'error');

    const restart = await SystemService.restart();

    expect(restart).toBeTruthy();
    expect(log).toHaveBeenCalledWith('Error restarting: error');

    spy.mockRestore();
  });
});

describe('Test: update', () => {
  it('Should return true', async () => {
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.2');

    const update = await SystemService.update();

    expect(update).toBeTruthy();
  });

  it('Should throw an error if latest version is not set', async () => {
    TipiCache.del('latestVersion');
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: null },
    });

    setConfig('version', '0.0.1');

    await expect(SystemService.update()).rejects.toThrow('Could not get latest version');

    spy.mockRestore();
  });

  it('Should throw if current version is higher than latest', async () => {
    setConfig('version', '0.0.2');
    TipiCache.set('latestVersion', '0.0.1');

    await expect(SystemService.update()).rejects.toThrow('Current version is newer than latest version');
  });

  it('Should throw if current version is equal to latest', async () => {
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.1');

    await expect(SystemService.update()).rejects.toThrow('Current version is already up to date');
  });

  it('Should throw an error if there is a major version difference', async () => {
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '1.0.0');

    await expect(SystemService.update()).rejects.toThrow('The major version has changed. Please update manually');
  });

  it('Should log error if fails', async () => {
    // @ts-ignore
    const spy = jest.spyOn(childProcess, 'execFile').mockImplementation((_path, _args, _, cb) => {
      // @ts-ignore
      if (cb) cb('error', null, null);
    });
    const log = jest.spyOn(logger, 'error');

    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.2');

    const update = await SystemService.update();

    expect(update).toBeTruthy();
    expect(log).toHaveBeenCalledWith('Error updating: error');

    spy.mockRestore();
  });
});
