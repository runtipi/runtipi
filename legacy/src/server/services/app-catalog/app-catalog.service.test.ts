import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService, IAppFileAccessor } from '@runtipi/shared/node';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../tests/apps.factory';
import { mock, anyString, mockReset } from 'vitest-mock-extended';
import { Container } from 'inversify';
import { AppCatalogService, type IAppCatalogService } from './app-catalog.service';

describe('AppCatalogService', () => {
  // Prepare the mocks
  const mockQueries = mock<IAppQueries>();
  const mockAppDataService = mock<IAppDataService>();
  const mockAppFileAccessor = mock<IAppFileAccessor>();

  // Prepare the container
  const container = new Container();
  container.bind<IAppQueries>('IAppQueries').toConstantValue(mockQueries);
  container.bind<IAppDataService>('IAppDataService').toConstantValue(mockAppDataService);
  container.bind<IAppFileAccessor>('IAppFileAccessor').toConstantValue(mockAppFileAccessor);
  container.bind<IAppCatalogService>('IAppCatalogService').to(AppCatalogService);

  // Get the AppCatalogService
  const appCatalog = container.get<IAppCatalogService>('IAppCatalogService');

  beforeEach(() => {
    mockReset(mockQueries);
    mockReset(mockAppDataService);
  });

  describe('Get app config', () => {
    it('should correctly get app config', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({});
      mockQueries.getApp.calledWith(anyString()).mockResolvedValue(appEntity);
      mockAppDataService.getAppInfoFromInstalledOrAppStore.calledWith(anyString()).mockResolvedValue(appInfo);

      // act
      const app = await appCatalog.getApp(appEntity.id);

      // assert
      expect(app).toBeDefined();
      expect(app.config).toStrictEqual({ TEST_FIELD: 'test' });
      expect(app.id).toBe(appEntity.id);
      expect(app.status).toBe('running');
    });

    it('should return default values if app is not installed', async () => {
      // arrange
      const { appInfo } = await createApp({});
      mockQueries.getApp.calledWith(anyString()).mockResolvedValue(undefined);
      mockAppDataService.getAppInfoFromInstalledOrAppStore.calledWith(anyString()).mockResolvedValue(appInfo);

      // act
      const app = await appCatalog.getApp(appInfo.id);

      // assert
      expect(app).toBeDefined();
      expect(app.id).toBe(appInfo.id);
      expect(app.config).toStrictEqual({});
      expect(app.status).toBe('missing');
    });
  });
});
