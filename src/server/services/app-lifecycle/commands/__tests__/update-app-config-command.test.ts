import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { AppQueries, type IAppQueries } from '@/server/queries/apps/apps.queries';
import { createApp, createAppConfig, insertApp } from '@/server/tests/apps.factory';
import { faker } from '@faker-js/faker';
import { AppDataService, type IAppDataService } from '@runtipi/shared/node';
import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateAppConfigCommand } from '../update-app-config-command';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { anything, mock, when, instance } from 'ts-mockito';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import type { App } from '@runtipi/db';

const getCommand = (mockQueries: IAppQueries, mockEventDispatcher: IEventDispatcher, mockAppDataService: IAppDataService) => {
  return new UpdateAppConfigCommand({
    queries: instance(mockQueries),
    eventDispatcher: instance(mockEventDispatcher),
    appDataService: instance(mockAppDataService),
    executeOtherCommand: vi.fn(),
  });
};

describe('Update app config', () => {
  let mockQueries: IAppQueries;
  let mockEventDispatcher: IEventDispatcher;
  let mockAppDataService: IAppDataService;

  beforeEach(() => {
    mockQueries = mock(AppQueries);
    mockEventDispatcher = mock(EventDispatcher);
    mockAppDataService = mock(AppDataService);
    when(mockEventDispatcher.dispatchEventAsync(anything())).thenResolve({ success: true });
  });

  describe('Update app config', () => {
    it('should correctly update app config', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({});
      const word = faker.lorem.word();
      let update = {} as App;

      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(appInfo);
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockQueries.updateApp(appEntity.id, anything())).thenCall((_, data) => {
        update = data;
        return Promise.resolve();
      });
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act
      await updateAppConfig.execute({ appId: appEntity.id, form: { TEST_FIELD: word } });

      // assert
      expect(castAppConfig(update.config).TEST_FIELD).toBe(word);
    });

    it('should throw if app is not installed', async () => {
      // arrange
      when(mockQueries.getApp('test-app-2')).thenResolve(undefined);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: 'test-app-2', form: { test: 'test' } })).rejects.toThrow('APP_ERROR_APP_NOT_FOUND');
    });

    it('should throw if app is exposed and domain is not provided', async () => {
      // arrange
      const { appInfo, appEntity } = await createApp({ exposable: true });
      when(mockQueries.getApp(appInfo.id)).thenResolve(appEntity);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appInfo.id, form: { exposed: true } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
      );
    });

    it('should throw if app is exposed and domain is not valid', async () => {
      // arrange
      const { appEntity } = await createApp({ exposable: true });
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain: 'test' } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_NOT_VALID',
      );
    });

    it('should throw if app is exposed and domain is already used', async () => {
      // arrange
      const domain = faker.internet.domainName();
      const { appEntity, appInfo } = await createApp({ exposable: true });
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(appInfo);
      when(mockQueries.getAppsByDomain(domain, appEntity.id)).thenResolve([appEntity]);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_ALREADY_IN_USE',
      );
    });

    it('should throw if app is not exposed and config has force_expose set to true', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ forceExpose: true });
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(appInfo);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: {} })).rejects.toThrow('APP_ERROR_APP_FORCE_EXPOSED');
    });

    it('should throw if app is exposed and config does not allow it', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ exposable: false });
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(appInfo);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
        'APP_ERROR_APP_NOT_EXPOSABLE',
      );
    });

    it('should throw if app has force_expose set to true and exposed to true and no domain', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ forceExpose: true });
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(appInfo);
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true } })).rejects.toThrow(
        'APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP',
      );
    });

    it('should throw if event dispatcher fails', async () => {
      // arrange
      const { appEntity, appInfo } = await createApp({ exposable: true });
      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(appInfo);
      when(mockEventDispatcher.dispatchEventAsync(anything())).thenResolve({ success: false });
      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: {} })).rejects.toThrow('APP_ERROR_APP_FAILED_TO_UPDATE');
    });

    it('should throw if the app config is invalid', async () => {
      // arrange
      const { appEntity } = await createApp({});

      when(mockQueries.getApp(appEntity.id)).thenResolve(appEntity);
      when(mockAppDataService.getInstalledInfo(appEntity.id)).thenResolve(undefined);

      const updateAppConfig = getCommand(mockQueries, mockEventDispatcher, mockAppDataService);

      // act & assert
      await expect(updateAppConfig.execute({ appId: appEntity.id, form: { exposed: true, domain: 'test.com' } })).rejects.toThrow(
        'APP_ERROR_APP_NOT_FOUND',
      );
    });
  });
});
