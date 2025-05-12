import { createAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { Test } from '@nestjs/testing';
import type { AppInfo } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppFilesManager } from '../app-files-manager';
import { AppHelpers } from '../app.helpers';

describe('AppHelpers', () => {
  let appHelpers: AppHelpers;
  let appFilesManager = mock<AppFilesManager>();
  let config = mock<ConfigurationService>();
  let filesystem = mock<FilesystemService>();
  let envUtils = mock<EnvUtils>();
  const testAppUrn: AppUrn = createAppUrn('test-app', 'test-store');

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppHelpers],
    })
      .useMocker(mock)
      .compile();

    appHelpers = moduleRef.get(AppHelpers);
    appFilesManager = moduleRef.get(AppFilesManager);
    config = moduleRef.get(ConfigurationService);
    filesystem = moduleRef.get(FilesystemService);
    envUtils = moduleRef.get(EnvUtils);
  });

  describe('generateEnvFile', () => {
    const mockAppInfo: AppInfo = {
      id: 'test-app',
      urn: testAppUrn,
      name: 'Test App',
      author: 'Test Author',
      port: 8080,
      https: false,
      no_gui: false,
      available: true,
      exposable: true,
      dynamic_config: true,
      source: 'http://example.com',
      version: '1.0.0',
      categories: ['utilities'],
      description: 'Test description',
      short_desc: 'Test short description',
      website: 'http://example.com',
      supported_architectures: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      deprecated: false,
      tipi_version: 1,
      force_expose: false,
      force_pull: false,
      generate_vapid_keys: false,
      form_fields: [],
    };

    beforeEach(() => {
      config.getConfig.mockReturnValue(
        fromPartial({
          internalIp: '127.0.0.1',
          envFilePath: '/data/.env',
          rootFolderHost: '/opt/runtipi',
          userSettings: {
            appDataPath: '/opt/runtipi',
          },
        }),
      );

      envUtils.envStringToMap.mockReturnValue(new Map());
      envUtils.envMapToString.mockReturnValue('');
      appFilesManager.getInstalledAppInfo.mockResolvedValue(mockAppInfo);
      appFilesManager.getAppEnv.mockResolvedValue({ path: '/data/.env', content: '' });
      filesystem.readTextFile.mockResolvedValue('');
    });

    it('should throw an error if app is not found', async () => {
      // Arrange
      appFilesManager.getInstalledAppInfo.mockResolvedValue(null);

      // Act & Assert
      await expect(appHelpers.generateEnvFile(testAppUrn, {})).rejects.toThrow(`App ${testAppUrn} not found`);
    });

    it('should set default env variables correctly', async () => {
      // Arrange
      const envMap = new Map<string, string>();
      envUtils.envStringToMap.mockReturnValue(envMap);

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {});

      // Assert
      expect(envMap.get('APP_PORT')).toBe('8080');
      expect(envMap.get('APP_ID')).toBe('test-app-test-store');
      expect(envMap.get('ROOT_FOLDER_HOST')).toBe('/opt/runtipi');
      expect(envMap.get('APP_DATA_DIR')).toBe('/opt/runtipi/app-data/test-store/test-app');
    });

    it('should handle form port override', async () => {
      // Arrange
      const envMap = new Map<string, string>();
      envUtils.envStringToMap.mockReturnValue(envMap);
      const customPort = 9090;

      // Act
      await appHelpers.generateEnvFile(testAppUrn, { port: customPort });

      // Assert
      expect(envMap.get('APP_PORT')).toBe(String(customPort));
    });

    it('should generate VAPID keys if configured', async () => {
      // Arrange
      const envMap = new Map<string, string>();
      envUtils.envStringToMap.mockReturnValue(envMap);
      const appInfoWithVapid = { ...mockAppInfo, generate_vapid_keys: true };
      appFilesManager.getInstalledAppInfo.mockResolvedValue(appInfoWithVapid);

      const mockVapidKeys = {
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
      };
      envUtils.generateVapidKeys.mockReturnValue(mockVapidKeys);

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {});

      // Assert
      expect(envMap.get('VAPID_PUBLIC_KEY')).toBe(mockVapidKeys.publicKey);
      expect(envMap.get('VAPID_PRIVATE_KEY')).toBe(mockVapidKeys.privateKey);
    });

    it('should reuse existing VAPID keys if available', async () => {
      // Arrange
      const existingEnvMap = new Map<string, string>([
        ['VAPID_PUBLIC_KEY', 'existing-public-key'],
        ['VAPID_PRIVATE_KEY', 'existing-private-key'],
      ]);
      const newEnvMap = new Map<string, string>();
      envUtils.envStringToMap
        .mockReturnValueOnce(newEnvMap) // For base env file
        .mockReturnValueOnce(existingEnvMap); // For app env file

      const appInfoWithVapid = { ...mockAppInfo, generate_vapid_keys: true };
      appFilesManager.getInstalledAppInfo.mockResolvedValue(appInfoWithVapid);

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {});

      // Assert
      expect(newEnvMap.get('VAPID_PUBLIC_KEY')).toBe('existing-public-key');
      expect(newEnvMap.get('VAPID_PRIVATE_KEY')).toBe('existing-private-key');
    });

    it('should set correct domain settings when app is exposed', async () => {
      // Arrange
      const envMap = new Map<string, string>();
      envUtils.envStringToMap.mockReturnValue(envMap);
      const domain = 'test.example.com';

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {
        exposed: true,
        domain,
      });

      // Assert
      expect(envMap.get('APP_EXPOSED')).toBe('true');
      expect(envMap.get('APP_DOMAIN')).toBe(domain);
      expect(envMap.get('APP_HOST')).toBe(domain);
      expect(envMap.get('APP_PROTOCOL')).toBe('https');
    });

    it('should set correct domain settings for local exposure', async () => {
      // Arrange
      const envMap = new Map<string, string>([['LOCAL_DOMAIN', 'local.test']]);
      envUtils.envStringToMap.mockReturnValue(envMap);

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {
        exposedLocal: true,
        openPort: false,
      });

      // Assert
      expect(envMap.get('APP_DOMAIN')).toBe('test-app-test-store.local.test');
      expect(envMap.get('APP_HOST')).toBe('test-app-test-store.local.test');
      expect(envMap.get('APP_PROTOCOL')).toBe('https');
    });

    it('should set correct domain settings for internal access', async () => {
      // Arrange
      const envMap = new Map<string, string>();
      envUtils.envStringToMap.mockReturnValue(envMap);
      const port = 8080;

      // Act
      await appHelpers.generateEnvFile(testAppUrn, { port });

      // Assert
      expect(envMap.get('APP_DOMAIN')).toBe('127.0.0.1:8080');
      expect(envMap.get('APP_HOST')).toBe('127.0.0.1');
      expect(envMap.get('APP_PROTOCOL')).toBe('http');
    });

    it('should throw error for required form fields', async () => {
      // Arrange
      const appInfoWithRequired = {
        ...mockAppInfo,
        form_fields: [
          {
            env_variable: 'REQUIRED_VAR',
            label: 'Required Variable',
            required: true,
            type: 'text' as const,
          },
        ],
      };
      appFilesManager.getInstalledAppInfo.mockResolvedValue(appInfoWithRequired);

      // Act & Assert
      await expect(appHelpers.generateEnvFile(testAppUrn, {})).rejects.toThrow('Variable Required Variable is required');
    });

    it('should handle random type form fields', async () => {
      // Arrange
      const envMap = new Map<string, string>();
      envUtils.envStringToMap.mockReturnValue(envMap);

      const appInfoWithRandom = {
        ...mockAppInfo,
        form_fields: [
          {
            env_variable: 'RANDOM_VAR',
            type: 'random' as const,
            min: 16,
            label: 'Random Variable',
            required: false,
            options: undefined,
            tooltip: undefined,
            force_write: undefined,
            value: undefined,
            placeholder: undefined,
            encoding: undefined,
            max: undefined,
          },
        ],
      };
      appFilesManager.getInstalledAppInfo.mockResolvedValue(appInfoWithRandom);

      const randomString = 'random-string';
      envUtils.createRandomString.mockReturnValue(randomString);

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {});

      // Assert
      expect(envMap.get('RANDOM_VAR')).toBe(randomString);
      expect(envUtils.createRandomString).toHaveBeenCalledWith('RANDOM_VAR', 16, undefined);
    });

    it('should write the transformed env map to file', async () => {
      // Arrange
      const envMap = new Map<string, string>([['TEST_VAR', 'test-value']]);
      envUtils.envStringToMap.mockReturnValue(envMap);
      const transformedEnv = 'TEST_VAR=test-value';
      envUtils.envMapToString.mockReturnValue(transformedEnv);

      // Act
      await appHelpers.generateEnvFile(testAppUrn, {});

      // Assert
      expect(appFilesManager.writeAppEnv).toHaveBeenCalledWith(testAppUrn, transformedEnv);
    });
  });
});
