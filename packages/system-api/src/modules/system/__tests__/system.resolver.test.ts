import { faker } from '@faker-js/faker';
import axios from 'axios';
import fs from 'fs-extra';
import { DataSource } from 'typeorm';
import TipiCache from '../../../config/TipiCache';
import * as TipiConfig from '../../../core/config/TipiConfig';
import { setConfig } from '../../../core/config/TipiConfig';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { gcall } from '../../../test/gcall';
import { restartMutation, updateMutation } from '../../../test/mutations';
import { systemInfoQuery, versionQuery } from '../../../test/queries';
import User from '../../auth/user.entity';
import { createUser } from '../../auth/__tests__/user.factory';
import { SystemInfoResponse } from '../system.types';
import EventDispatcher from '../../../core/config/EventDispatcher';

jest.mock('fs-extra');
jest.mock('axios');
jest.mock('redis');

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

let db: DataSource | null = null;
const TEST_SUITE = 'systemresolver';
beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  await User.clear();
});

describe('Test: systemInfo', () => {
  it('Should return correct system info from file', async () => {
    const systemInfo = {
      cpu: { load: 10 },
      memory: { available: 100, total: 1000, used: 900 },
      disk: { available: 100, total: 1000, used: 900 },
    };

    const MockFiles = {
      '/runtipi/state/system-info.json': JSON.stringify(systemInfo),
    };

    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const { data } = await gcall<{ systemInfo: SystemInfoResponse }>({ source: systemInfoQuery });

    expect(data?.systemInfo).toBeDefined();
    expect(data?.systemInfo.cpu).toBeDefined();
    expect(data?.systemInfo.cpu.load).toBe(systemInfo.cpu.load);
    expect(data?.systemInfo.memory).toBeDefined();
    expect(data?.systemInfo.memory.available).toBe(systemInfo.memory.available);
    expect(data?.systemInfo.memory.total).toBe(systemInfo.memory.total);
    expect(data?.systemInfo.memory.used).toBe(systemInfo.memory.used);
    expect(data?.systemInfo.disk).toBeDefined();
    expect(data?.systemInfo.disk.available).toBe(systemInfo.disk.available);
    expect(data?.systemInfo.disk.total).toBe(systemInfo.disk.total);
    expect(data?.systemInfo.disk.used).toBe(systemInfo.disk.used);
  });

  it('Should return 0 for missing values', async () => {
    const systemInfo = {
      cpu: {},
      memory: {},
      disk: {},
    };

    const MockFiles = {
      '/runtipi/state/system-info.json': JSON.stringify(systemInfo),
    };

    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    const { data } = await gcall<{ systemInfo: SystemInfoResponse }>({ source: systemInfoQuery });

    expect(data?.systemInfo).toBeDefined();
    expect(data?.systemInfo.cpu).toBeDefined();
    expect(data?.systemInfo.cpu.load).toBe(0);
    expect(data?.systemInfo.memory).toBeDefined();
    expect(data?.systemInfo.memory.available).toBe(0);
    expect(data?.systemInfo.memory.total).toBe(0);
    expect(data?.systemInfo.memory.used).toBe(0);
    expect(data?.systemInfo.disk).toBeDefined();
    expect(data?.systemInfo.disk.available).toBe(0);
    expect(data?.systemInfo.disk.total).toBe(0);
    expect(data?.systemInfo.disk.used).toBe(0);
  });
});

describe('Test: getVersion', () => {
  const current = `${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}`;
  const latest = `${faker.random.numeric(1)}.${faker.random.numeric(1)}.${faker.random.numeric()}`;
  beforeEach(async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({
      data: { name: `v${latest}` },
    });
    setConfig('version', current);
  });

  it('Should return correct version', async () => {
    const { data } = await gcall<{ version: { current: string; latest?: string } }>({
      source: versionQuery,
    });

    expect(data?.version).toBeDefined();
    expect(data?.version.current).toBeDefined();
    expect(data?.version.latest).toBeDefined();
    expect(data?.version.current).toBe(current);
    expect(data?.version.latest).toBe(latest);
  });
});

describe('Test: restart', () => {
  beforeEach(async () => {
    setConfig('status', 'RUNNING');
    setConfig('version', '1.0.0');
    TipiCache.set('latestVersion', '1.0.1');
  });

  it('Should return true', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });

    // Act
    const user = await createUser();
    const { data } = await gcall<{ restart: boolean }>({ source: restartMutation, userId: user.id });

    // Assert
    expect(data?.restart).toBeDefined();
    expect(data?.restart).toBe(true);
  });

  it("Should return an error if user doesn't exist", async () => {
    // Arrange
    const { data, errors } = await gcall<{ restart: boolean }>({
      source: restartMutation,
      userId: 1,
    });

    // Assert
    expect(errors?.[0].message).toBe('Access denied! You need to be authorized to perform this action!');
    expect(data?.restart).toBeUndefined();
  });

  it('Should throw an error if no userId is not provided', async () => {
    // Arrange
    const { data, errors } = await gcall<{ restart: boolean }>({ source: restartMutation });

    // Assert
    expect(errors?.[0].message).toBe('Access denied! You need to be authorized to perform this action!');
    expect(data?.restart).toBeUndefined();
  });

  it('Should set app status to restarting', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });
    const spy = jest.spyOn(TipiConfig, 'setConfig');
    const user = await createUser();

    // Act
    await gcall<{ restart: boolean }>({ source: restartMutation, userId: user.id });

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenNthCalledWith(1, 'status', 'RESTARTING');

    spy.mockRestore();
  });
});

describe('Test: update', () => {
  beforeEach(async () => {
    setConfig('status', 'RUNNING');
    setConfig('version', '1.0.0');
    TipiCache.set('latestVersion', '1.0.1');
  });

  it('Should return true', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });
    const user = await createUser();

    // Act
    const { data } = await gcall<{ update: boolean }>({ source: updateMutation, userId: user.id });

    // Assert
    expect(data?.update).toBeDefined();
    expect(data?.update).toBe(true);
  });

  it("Should return an error if user doesn't exist", async () => {
    // Act
    const { data, errors } = await gcall<{ update: boolean }>({ source: updateMutation, userId: 1 });

    // Assert
    expect(errors?.[0].message).toBe('Access denied! You need to be authorized to perform this action!');
    expect(data?.update).toBeUndefined();
  });

  it('Should throw an error if no userId is not provided', async () => {
    // Act
    const { data, errors } = await gcall<{ update: boolean }>({ source: updateMutation });

    // Assert
    expect(errors?.[0].message).toBe('Access denied! You need to be authorized to perform this action!');
    expect(data?.update).toBeUndefined();
  });

  it('Should set app status to updating', async () => {
    // Arrange
    EventDispatcher.prototype.dispatchEventAsync = jest.fn().mockResolvedValueOnce({ success: true });
    const spy = jest.spyOn(TipiConfig, 'setConfig');
    const user = await createUser();

    // Act
    await gcall<{ update: boolean }>({ source: updateMutation, userId: user.id });

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenNthCalledWith(1, 'status', 'UPDATING');

    spy.mockRestore();
  });
});
