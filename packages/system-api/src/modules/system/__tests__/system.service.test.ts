import fs from 'fs-extra';
import semver from 'semver';
import axios from 'axios';
import SystemService from '../system.service';
import { faker } from '@faker-js/faker';
import TipiCache from '../../../config/TipiCache';
import { setConfig } from '../../../core/config/TipiConfig';

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
});

describe('Test: update', () => {
  it('Should return true', async () => {
    setConfig('version', '0.0.1');
    TipiCache.set('latestVersion', '0.0.2');

    const update = await SystemService.update();

    expect(update).toBeTruthy();
  });
});
