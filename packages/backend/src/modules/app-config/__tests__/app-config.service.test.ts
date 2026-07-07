import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppConfigService } from '../app-config.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { TranslatableError } from '@/common/error/translatable-error';
import { createAppUrn } from '@/common/helpers/app-helpers';
import { faker } from '@faker-js/faker';
import { fromAny, fromPartial } from '@total-typescript/shoehorn';
import * as yaml from 'yaml';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let mockFilesystem: ReturnType<typeof mock<FilesystemService>>;
  let mockAppsRepository: ReturnType<typeof mock<AppsRepository>>;
  let mockMarketplaceService: ReturnType<typeof mock<MarketplaceService>>;
  let mockConfigService: ReturnType<typeof mock<ConfigurationService>>;
  let mockLogger: ReturnType<typeof mock<LoggerService>>;
  let mockAppFilesManager: ReturnType<typeof mock<AppFilesManager>>;

  const mockDataDir = '/data';
  const mockAppUrn = createAppUrn('test-app', 'test-store');
  const mockConfigPath = '/data/apps/test-store/test-app/docker-compose.yml';

  beforeEach(async () => {
    mockFilesystem = mock<FilesystemService>();
    mockAppsRepository = mock<AppsRepository>();
    mockMarketplaceService = mock<MarketplaceService>();
    mockConfigService = mock<ConfigurationService>();
    mockLogger = mock<LoggerService>();
    mockAppFilesManager = mock<AppFilesManager>();

    mockConfigService.get.mockImplementation(
      fromAny((key: string) => {
        if (key === 'directories') return { dataDir: mockDataDir };
        if (key === 'demoMode') return false;
        return undefined;
      }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AppConfigService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: FilesystemService, useValue: mockFilesystem },
        { provide: ConfigurationService, useValue: mockConfigService },
        { provide: AppsRepository, useValue: mockAppsRepository },
        { provide: MarketplaceService, useValue: mockMarketplaceService },
        { provide: AppFilesManager, useValue: mockAppFilesManager },
      ],
    }).compile();

    service = moduleRef.get(AppConfigService);
  });

  describe('getAppConfig', () => {
    it('should return JSON-stringified config when file exists', async () => {
      // Arrange
      const parsedContent = { version: '3', services: { app: { image: 'test' } } };
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content: parsedContent }));

      // Act
      const result = await service.getAppConfig(mockAppUrn);

      // Assert
      expect(result).toBe(JSON.stringify(parsedContent, null, 2));
    });

    it('should return null when no content is found', async () => {
      // Arrange
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content: null }));

      // Act
      const result = await service.getAppConfig(mockAppUrn);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when AppFilesManager throws', async () => {
      // Arrange
      mockAppFilesManager.getSourceDockerComposeYaml.mockRejectedValue(new Error('read error'));

      // Act
      const result = await service.getAppConfig(mockAppUrn);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateAppConfig', () => {
    it('should write config to the correct path when YAML is valid', async () => {
      // Arrange
      const configContent = 'version: "3"\nservices:\n  app:\n    image: test';
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: faker.number.int(), appName: 'test-app', appStoreSlug: 'test-store' }));
      mockFilesystem.writeTextFile.mockResolvedValue(true);

      // Act
      await service.updateAppConfig(mockAppUrn, { config: configContent });

      // Assert
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledWith(mockConfigPath, configContent);
      expect(mockLogger.info).toHaveBeenCalledWith(`App ${mockAppUrn} config updated successfully`);
    });

    it('should throw TranslatableError when app is not found', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(null));

      // Act & Assert
      await expect(service.updateAppConfig(mockAppUrn, { config: 'test' })).rejects.toThrow(TranslatableError);
    });

    it('should throw TranslatableError with APP_ERROR_INVALID_CONFIG for invalid YAML', async () => {
      // Arrange
      const invalidYaml = 'invalid: yaml: content: [}';
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: faker.number.int(), appName: 'test-app', appStoreSlug: 'test-store' }));

      // Act & Assert
      await expect(service.updateAppConfig(mockAppUrn, { config: invalidYaml })).rejects.toThrow(TranslatableError);
    });

    it('should throw TranslatableError with APP_ERROR_SAVE_CONFIG for filesystem write failure', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: faker.number.int(), appName: 'test-app', appStoreSlug: 'test-store' }));
      mockFilesystem.writeTextFile.mockResolvedValue(false);

      // Act & Assert
      await expect(service.updateAppConfig(mockAppUrn, { config: 'version: "3"' })).rejects.toThrow(
        new TranslatableError('APP_ERROR_SAVE_CONFIG', { id: mockAppUrn }, HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should throw TranslatableError when in demo mode', async () => {
      // Arrange
      mockConfigService.get.mockImplementation(
        fromAny((key: string) => {
          if (key === 'demoMode') return true;
          return undefined;
        }),
      );

      // Act & Assert
      await expect(service.updateAppConfig(mockAppUrn, { config: 'test' })).rejects.toThrow('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    });
  });

  describe('getTemplateDiff', () => {
    it('should return no changes when configs match', async () => {
      // Arrange - both local and template have the same content object
      const parsedContent = { version: '3', services: { app: { image: 'test' } } };
      const mockApp = fromPartial({
        id: faker.number.int(),
        appName: 'test-app',
        appStoreSlug: 'test-store',
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content: parsedContent }));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: parsedContent }));

      // Act
      const result = await service.getTemplateDiff(mockAppUrn);

      // Assert
      expect(result.hasChanges).toBe(false);
      expect(result.localVersion).toBe(1);
      expect(result.templateVersion).toBe(1);
      expect(result.current).toBeUndefined();
      expect(result.template).toBeUndefined();
    });

    it('should return diff when configs differ', async () => {
      // Arrange
      const localContent = { version: '3', services: { app: { image: 'local-image' } } };
      const templateContent = { version: '3', services: { app: { image: 'template-image' } } };
      const mockApp = fromPartial({
        id: faker.number.int(),
        appName: 'test-app',
        appStoreSlug: 'test-store',
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content: localContent }));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateContent }));

      // Act
      const result = await service.getTemplateDiff(mockAppUrn);

      // Assert
      expect(result.hasChanges).toBe(true);
      expect(result.current).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.current).toContain('local-image');
      expect(result.template).toContain('template-image');
    });

    it('should return no changes when app has no template', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({ id: faker.number.int(), appName: 'test-app', appStoreSlug: '_user', templateUrn: null }),
      );

      // Act
      const result = await service.getTemplateDiff(mockAppUrn);

      // Assert
      expect(result.hasChanges).toBe(false);
      expect(result.localVersion).toBe(0);
      expect(result.templateVersion).toBe(0);
    });

    it('should return no changes when app is not found', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(null));

      // Act
      const result = await service.getTemplateDiff(mockAppUrn);

      // Assert
      expect(result.hasChanges).toBe(false);
    });

    it('should throw TranslatableError when template config is not found', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({ id: faker.number.int(), templateUrn: 'template:test-store', templateVersion: 1 }),
      );
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content: null }));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: null }));

      // Act & Assert
      await expect(service.getTemplateDiff(mockAppUrn)).rejects.toThrow(TranslatableError);
    });

    it('should extract template version from x-runtipi schema_version', async () => {
      // Arrange
      const templateConfig = { version: '3', 'x-runtipi': { schema_version: 5 } };
      mockAppsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({ id: faker.number.int(), templateUrn: 'template:test-store', templateVersion: 2 }),
      );
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content: { version: '3' } }));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));

      // Act
      const result = await service.getTemplateDiff(mockAppUrn);

      // Assert
      expect(result.templateVersion).toBe(5);
      expect(result.localVersion).toBe(2);
    });

    it('should default to version 1 when x-runtipi is not present', async () => {
      // Arrange
      const content = { version: '3' };
      mockAppsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({ id: faker.number.int(), templateUrn: 'template:test-store', templateVersion: 1 }),
      );
      mockAppFilesManager.getSourceDockerComposeYaml.mockResolvedValue(fromPartial({ content }));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content }));

      // Act
      const result = await service.getTemplateDiff(mockAppUrn);

      // Assert
      expect(result.templateVersion).toBe(1);
    });
  });

  describe('syncWithTemplate', () => {
    it('should update config and database when syncing', async () => {
      // Arrange
      const templateConfig = 'version: "3"\nservices:\n  app:\n    image: template-image';
      const mockApp = fromPartial({
        id: 42,
        appName: 'test-app',
        appStoreSlug: 'test-store',
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));
      mockFilesystem.readTextFile.mockResolvedValue('old-config');
      mockFilesystem.writeTextFile.mockResolvedValue(true);
      mockAppsRepository.updateAppById.mockResolvedValue(fromAny(mockApp));

      // Act
      await service.syncWithTemplate(mockAppUrn);

      // Assert
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledWith(expect.stringContaining('docker-compose.yml.backup.'), 'old-config');
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledWith(mockConfigPath, templateConfig);
      expect(mockAppsRepository.updateAppById).toHaveBeenCalledWith(42, {
        lastTemplateSyncAt: expect.any(Number),
        templateVersion: 1,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(`App ${mockAppUrn} synced with template successfully`);
    });

    it('should throw TranslatableError when app is not found', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(null));

      // Act & Assert
      await expect(service.syncWithTemplate(mockAppUrn)).rejects.toThrow(TranslatableError);
    });

    it('should throw TranslatableError when app has no template', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: faker.number.int(), appStoreSlug: '_user', templateUrn: null }));

      // Act & Assert
      await expect(service.syncWithTemplate(mockAppUrn)).rejects.toThrow(TranslatableError);
    });

    it('should throw TranslatableError when template config is not found', async () => {
      // Arrange
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: faker.number.int(), templateUrn: 'template:test-store' }));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: null }));

      // Act & Assert
      await expect(service.syncWithTemplate(mockAppUrn)).rejects.toThrow(TranslatableError);
    });

    it('should throw TranslatableError when in demo mode', async () => {
      // Arrange
      mockConfigService.get.mockImplementation(
        fromAny((key: string) => {
          if (key === 'demoMode') return true;
          return undefined;
        }),
      );

      // Act & Assert
      await expect(service.syncWithTemplate(mockAppUrn)).rejects.toThrow('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    });

    it('should backup current config before sync when config exists', async () => {
      // Arrange
      const localConfig = 'version: "2"';
      const templateConfig = 'version: "3"';
      const mockApp = fromPartial({
        id: faker.number.int(),
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));
      mockFilesystem.readTextFile.mockResolvedValue(localConfig);
      mockFilesystem.writeTextFile.mockResolvedValue(true);
      mockAppsRepository.updateAppById.mockResolvedValue(fromAny(mockApp));

      // Act
      await service.syncWithTemplate(mockAppUrn);

      // Assert - first write is backup, second is new config
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledTimes(2);
      expect(mockFilesystem.writeTextFile).toHaveBeenNthCalledWith(1, expect.stringContaining('docker-compose.yml.backup.'), localConfig);
    });

    it('should skip backup when current config does not exist', async () => {
      // Arrange
      const templateConfig = 'version: "3"';
      const mockApp = fromPartial({
        id: faker.number.int(),
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));
      mockFilesystem.readTextFile.mockResolvedValue(null);
      mockFilesystem.writeTextFile.mockResolvedValue(true);
      mockAppsRepository.updateAppById.mockResolvedValue(fromAny(mockApp));

      // Act
      await service.syncWithTemplate(mockAppUrn);

      // Assert - only one write (no backup)
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(`No config found for ${mockAppUrn}, skipping backup`);
    });

    it('should convert object template content to YAML string when writing', async () => {
      // Arrange
      const templateConfig = { version: '3', services: { app: { image: 'test-image' } } };
      const mockApp = fromPartial({
        id: faker.number.int(),
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));
      mockFilesystem.readTextFile.mockResolvedValue('old-config');
      mockFilesystem.writeTextFile.mockResolvedValue(true);
      mockAppsRepository.updateAppById.mockResolvedValue(fromAny(mockApp));

      // Act
      await service.syncWithTemplate(mockAppUrn);

      // Assert
      const expectedYaml = yaml.stringify(templateConfig, { nullStr: '' });
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledWith(mockConfigPath, expectedYaml);
    });

    it('should preserve empty named volumes without writing null when syncing object template content', async () => {
      // Arrange
      const templateConfig = { volumes: { nginx_logs: null }, services: { app: { image: 'test-image' } } };
      const mockApp = fromPartial({
        id: faker.number.int(),
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));
      mockFilesystem.readTextFile.mockResolvedValue('old-config');
      mockFilesystem.writeTextFile.mockResolvedValue(true);
      mockAppsRepository.updateAppById.mockResolvedValue(fromAny(mockApp));

      // Act
      await service.syncWithTemplate(mockAppUrn);

      // Assert
      expect(mockFilesystem.writeTextFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining(`volumes:
  nginx_logs:
`),
      );
      expect(mockFilesystem.writeTextFile).not.toHaveBeenCalledWith(mockConfigPath, expect.stringContaining('nginx_logs: null'));
    });

    it('should extract template version from x-runtipi schema_version when syncing', async () => {
      // Arrange
      const templateConfig = { version: '3', 'x-runtipi': { schema_version: 10 } };
      const mockApp = fromPartial({
        id: 99,
        templateUrn: 'template:test-store',
        templateVersion: 1,
      });
      mockAppsRepository.getAppByUrn.mockResolvedValue(fromAny(mockApp));
      mockMarketplaceService.getSourceDockerComposeYaml.mockResolvedValue(fromAny({ content: templateConfig }));
      mockFilesystem.readTextFile.mockResolvedValue('old-config');
      mockFilesystem.writeTextFile.mockResolvedValue(true);
      mockAppsRepository.updateAppById.mockResolvedValue(fromAny(mockApp));

      // Act
      await service.syncWithTemplate(mockAppUrn);

      // Assert
      expect(mockAppsRepository.updateAppById).toHaveBeenCalledWith(99, {
        lastTemplateSyncAt: expect.any(Number),
        templateVersion: 10,
      });
    });
  });
});
