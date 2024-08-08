import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { faker } from '@faker-js/faker';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { TipiConfig } from '../../core/TipiConfig';
import { SystemServiceClass } from '.';
import type { ITipiCache } from '@/server/core/TipiCache/TipiCache';
import { container } from 'src/inversify.config';

const SystemService = new SystemServiceClass();

const server = setupServer();

afterAll(async () => {
  const tipiCache = container.get<ITipiCache>('ITipiCache');
  server.close();
  await tipiCache.close();
});

beforeAll(() => {
  server.listen();
});

beforeEach(async () => {
  const tipiCache = container.get<ITipiCache>('ITipiCache');
  await TipiConfig.setConfig('demoMode', false);
  await tipiCache.del('latestVersion');
  server.resetHandlers();
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
