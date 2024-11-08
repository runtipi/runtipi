import { faker } from '@faker-js/faker';
import { CacheMock } from '@runtipi/cache/src/mock';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SystemService } from './system.service';
import { LoggerMock } from 'packages/shared/src/node/logger/LoggerMock';
import { mock, mockReset } from 'vitest-mock-extended';
import { Container } from 'inversify';
import type { IAppCatalogService } from '../app-catalog/app-catalog.service';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';

const server = setupServer();

describe('SystemService', () => {
  // Prepare the mocks
  const mockCache = new CacheMock();
  const mockLogger = new LoggerMock();
  const mockEventDispatcher = mock<IEventDispatcher>();
  const mockAppCatalogService = mock<IAppCatalogService>();

  // Prepare the container
  const container = new Container();
  container.bind('ICache').toConstantValue(mockCache);
  container.bind('ILogger').toConstantValue(mockLogger);
  container.bind('IEventDispatcher').toConstantValue(mockEventDispatcher);
  container.bind('IAppCatalogService').toConstantValue(mockAppCatalogService);
  container.bind(SystemService).toSelf();

  // Get the AppCatalogService
  const systemService = container.get(SystemService);

  beforeEach(async () => {
    mockReset(mockEventDispatcher);
    mockReset(mockAppCatalogService);
    await mockCache.clear();
    server.resetHandlers();
  });

  afterAll(async () => {
    server.close();
  });

  beforeAll(() => {
    server.listen();
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
});
