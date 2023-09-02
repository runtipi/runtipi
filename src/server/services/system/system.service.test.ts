import { rest } from 'msw';
import { setupServer } from 'msw/node';
import fs from 'fs-extra';
import semver from 'semver';
import { faker } from '@faker-js/faker';
import { EventDispatcher } from '../../core/EventDispatcher';
import { setConfig } from '../../core/TipiConfig';
import { TipiCache } from '../../core/TipiCache';
import { SystemServiceClass } from '.';

jest.mock('redis');

const SystemService = new SystemServiceClass();

const server = setupServer();

const cache = new TipiCache();

beforeEach(async () => {
  await setConfig('demoMode', false);

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
  beforeAll(() => {
    server.listen();
  });

  beforeEach(async () => {
    server.resetHandlers();
    await cache.del('latestVersion');
  });

  afterAll(async () => {
    server.close();
    jest.restoreAllMocks();
    await cache.close();
  });

  it('It should return version with body', async () => {
    // Arrange
    const body = faker.lorem.words(10);
    server.use(
      rest.get('https://api.github.com/repos/meienberger/runtipi/releases/latest', (_, res, ctx) => {
        return res(ctx.json({ tag_name: `v${faker.string.numeric(1)}.${faker.string.numeric(1)}.${faker.string.numeric()}`, body }));
      }),
    );

    // Act
    const version = await SystemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(semver.valid(version.latest)).toBeTruthy();
    expect(version.body).toBeDefined();
  });

  it('Should return undefined for latest if request fails', async () => {
    server.use(
      rest.get('https://api.github.com/repos/meienberger/runtipi/releases/latest', (_, res, ctx) => {
        return res(ctx.status(500));
      }),
    );

    const version = await SystemService.getVersion();

    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(version.latest).toBeUndefined();
  });

  it('Should return cached version', async () => {
    // Arrange
    server.use(
      rest.get('https://api.github.com/repos/meienberger/runtipi/releases/latest', (_, res, ctx) => {
        return res(ctx.json({ tag_name: `v${faker.string.numeric(1)}.${faker.string.numeric(1)}.${faker.string.numeric()}` }));
      }),
    );

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
