import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import fs from 'fs-extra';
import { faker } from '@faker-js/faker';
import { TipiConfig } from '../../core/TipiConfig';
import { TipiCache } from '../../core/TipiCache';
import { SystemServiceClass } from '.';

const SystemService = new SystemServiceClass();

const server = setupServer();

const cache = new TipiCache('system.service.test');

afterAll(async () => {
  server.close();
  await cache.close();
});

beforeAll(() => {
  server.listen();
});

beforeEach(async () => {
  await TipiConfig.setConfig('demoMode', false);
  await cache.del('latestVersion');
  server.resetHandlers();
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
  it('Should return current version for latest if request fails', async () => {
    server.use(
      http.get('https://api.github.com/*', () => {
        return HttpResponse.json('Error', { status: 500 });
      }),
    );

    const version = await SystemService.getVersion();

    expect(version).toBeDefined();
    expect(version.current).toBeDefined();
    expect(version.latest).toBe(version.current);
  });

  it('Should return cached version', async () => {
    // Arrange
    server.use(
      http.get('https://api.github.com/*', () => {
        return HttpResponse.json({ tag_name: `v${faker.string.numeric(1)}.${faker.string.numeric(1)}.${faker.string.numeric()}` });
      }),
    );

    // Act
    const version = await SystemService.getVersion();
    const version2 = await SystemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();

    expect(version2.latest).toBe(version.latest);
    expect(version2.current).toBeDefined();
  });
});
