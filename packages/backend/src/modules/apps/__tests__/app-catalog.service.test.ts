import { createMockApp, createMockAppInfo } from '@/tests/helpers/app-mocks';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppCatalogService } from '../app-catalog.service';
import { AppFilesManager } from '../app-files-manager';
import { AppsRepository } from '../apps.repository';

describe('AppCatalogService', () => {
  let appCatalogService: AppCatalogService;
  let appsRepository = mock<AppsRepository>();
  let appFilesManager = mock<AppFilesManager>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppCatalogService],
    })
      .useMocker(mock)
      .compile();

    appCatalogService = moduleRef.get(AppCatalogService);
    appsRepository = moduleRef.get(AppsRepository);
    appFilesManager = moduleRef.get(AppFilesManager);
  });

  describe('getInstalledApps', () => {
    it('should return a list of installed apps', async () => {
      // arrange
      const appInfo1 = createMockAppInfo();
      const appInfo2 = createMockAppInfo();

      const app1 = createMockApp({ id: appInfo1.id });
      const app2 = createMockApp({ id: appInfo2.id });

      appsRepository.getApps.mockResolvedValueOnce(fromPartial([app1, app2]));
      appFilesManager.getInstalledAppInfo.calledWith(app1.id).mockResolvedValueOnce(appInfo1);
      appFilesManager.getInstalledAppInfo.calledWith(app2.id).mockResolvedValueOnce(appInfo2);
      appFilesManager.getAppInfoFromAppStore.calledWith(app1.id).mockResolvedValueOnce(appInfo1);
      appFilesManager.getAppInfoFromAppStore.calledWith(app2.id).mockResolvedValueOnce(appInfo2);

      // act
      const [result1, result2] = await appCatalogService.getInstalledApps();

      // assert
      expect(result1).toEqual({ app: app1, info: appInfo1 });
      expect(result2).toEqual({ app: app2, info: appInfo2 });
    });

    it('should return app as deprecated if it is missing from the app store', async () => {
      // arrange
      const appInfo1 = createMockAppInfo();
      const app1 = createMockApp({ id: appInfo1.id });

      appsRepository.getApps.mockResolvedValueOnce(fromPartial([app1]));
      appFilesManager.getInstalledAppInfo.calledWith(app1.id).mockResolvedValueOnce(appInfo1);
      appFilesManager.getAppInfoFromAppStore.calledWith(app1.id).mockResolvedValueOnce(undefined);

      // act
      const [result1] = await appCatalogService.getInstalledApps();

      // assert
      expect(result1).toEqual({ app: app1, info: { ...appInfo1, deprecated: true } });
    });

    it('should return app as deprecated if it is marked as deprecated in the app store', async () => {
      // arrange
      const appInfo1 = createMockAppInfo();
      const app1 = createMockApp({ id: appInfo1.id });

      appsRepository.getApps.mockResolvedValueOnce(fromPartial([app1]));
      appFilesManager.getInstalledAppInfo.calledWith(app1.id).mockResolvedValueOnce(appInfo1);
      appFilesManager.getAppInfoFromAppStore.calledWith(app1.id).mockResolvedValueOnce({ ...appInfo1, deprecated: true });

      // act
      const [result1] = await appCatalogService.getInstalledApps();

      // assert
      expect(result1).toEqual({ app: app1, info: { ...appInfo1, deprecated: true } });
    });
  });
});
