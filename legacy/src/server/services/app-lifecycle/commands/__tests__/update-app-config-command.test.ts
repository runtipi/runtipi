import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { createApp } from '@/server/tests/apps.factory';
import { faker } from '@faker-js/faker';
import type { IAppDataService, IAppFileAccessor } from '@runtipi/shared/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateAppConfigCommand } from '../update-app-config-command';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { anyObject, mock } from 'vitest-mock-extended';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import type { App } from '@runtipi/db';

describe('Update app config', () => {
  const mockQueries = mock<IAppQueries>();
  const mockEventDispatcher = mock<IEventDispatcher>();
  const mockAppDataService = mock<IAppDataService>();
  const mockAppFileAccessor = mock<IAppFileAccessor>();

  const updateAppConfig = new UpdateAppConfigCommand({
    queries: mockQueries,
    eventDispatcher: mockEventDispatcher,
    appDataService: mockAppDataService,
    executeOtherCommand: vi.fn(),
    appFileAccessor: mockAppFileAccessor,
  });

  beforeEach(() => {
    mockEventDispatcher.dispatchEventAsync.mockResolvedValue({ success: true });
  });

  describe('Update app config', () => {
    it('should correctly update app config', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({});
      const word = faker.lorem.word();
      let update = {} as Partial<App>;

      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(appInfo);
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);
      mockQueries.updateApp.calledWith(appEntity.id, anyObject()).mockImplementation(async (_, data) => {
        update = data;
        return data as App;
      });

      // act
      await updateAppConfig.execute({ appId: appEntity.id, form: { TEST_FIELD: word } });

      // assert
      expect(castAppConfig(update.config).TEST_FIELD).toBe(word);
    });

    it('should throw if app is not installed', async () => {
      // arrange
      mockQueries.getApp.calledWith('test-app-2').mockResolvedValue(undefined);

      // act & assert
      await expect(updateAppConfig.execute({ appId: 'test-app-2', form: { test: 'test' } })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
    });

    it('should throw if app is exposed and domain is not provided', async () => {
      // arrange
      const { appInfo, appEntity } = await createApp({ exposable: true });
      mockQueries.getApp.calledWith(appInfo.id).mockResolvedValue(appEntity);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appInfo.id, form: { exposed: true } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
      );
    });

    it('should throw if app is exposed and domain is not valid', async () => {
      // arrange
      const { appEntity } = await createApp({ exposable: true });
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain: 'test' } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_NOT_VALID',
      );
    });

    it('should throw if app is exposed and domain is already used', async () => {
      // arrange
      const domain = faker.internet.domainName();
      const { appEntity, appInfo } = await createApp({ exposable: true });
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);
      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(appInfo);
      mockQueries.getAppsByDomain.calledWith(domain, appEntity.id).mockResolvedValue([appEntity]);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_ALREADY_IN_USE',
      );
    });

    it('should throw if app is not exposed and config has force_expose set to true', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ forceExpose: true });
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);

      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(appInfo);
      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: {} })).rejects.toThrow('APP_ERROR_APP_FORCE_EXPOSED');
    });

    it('should throw if app is exposed and config does not allow it', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ exposable: false });
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);
      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(appInfo);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
        'APP_ERROR_APP_NOT_EXPOSABLE',
      );
    });

    it('should throw if app has force_expose set to true and exposed to true and no domain', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ forceExpose: true });
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);
      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(appInfo);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
      );
    });

    it('should throw if event dispatcher fails', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ exposable: true });
      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);
      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(appInfo);
      mockEventDispatcher.dispatchEventAsync.mockResolvedValue({ success: false });

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: {} })).rejects.toThrow('APP_ERROR_APP_FAILED_TO_UPDATE');
    });

    it('should throw if the app config is invalid', async () => {
      // arrange
      const { appEntity } = await createApp({});

      mockQueries.getApp.calledWith(appEntity.id).mockResolvedValue(appEntity);
      mockAppFileAccessor.getInstalledAppInfo.calledWith(appEntity.id).mockResolvedValue(undefined);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
        'APP_ERROR_APP_NOT_FOUND',
      );
    });
  });
});
