import { faker } from '@faker-js/faker';
import { CacheMock } from '@runtipi/cache/src/mock';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TipiConfig } from '../../core/TipiConfig';
import { SystemService } from './system.service';
import { LoggerMock } from 'packages/shared/src/node/logger/LoggerMock';

const cache = new CacheMock();
const logger = new LoggerMock();
const systemService = new SystemService(cache, logger);
const server = setupServer();

afterAll(async () => {
  server.close();
});

beforeAll(() => {
  server.listen();
});

beforeEach(async () => {
  await TipiConfig.setConfig('demoMode', false);
  await cache.del('latestVersion');
  server.resetHandlers();
});

describe('Test: getVersion', () => {
  it('Should return current version for latest if request fails', async () => {
    server.use(
      http.get('https://api.github.com/*', () => {
        return HttpResponse.json('Error', { status: 500 });
      }),
    );

    const version = await systemService.getVersion();

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
    const version = await systemService.getVersion();
    const version2 = await systemService.getVersion();

    // Assert
    expect(version).toBeDefined();
    expect(version.current).toBeDefined();

    expect(version2.latest).toBe(version.latest);
    expect(version2.current).toBeDefined();
  });
});
