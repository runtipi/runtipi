import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { RepoEventsQueue } from '../../queue/entities/repo-events';
import { AppStoreRepository } from '../app-store.repository';
import { AppStoreService } from '../app-store.service';
import { ReposHelpers } from '../repos.helpers';

describe('AppStoreService', () => {
  let appStoreService: AppStoreService;
  let appStoreRepository = mock<AppStoreRepository>();
  let config = mock<ConfigurationService>();
  let logger = mock<LoggerService>();
  let repoHelpers = mock<ReposHelpers>();
  let repoQueue = mock<RepoEventsQueue>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppStoreService],
    })
      .useMocker(mock)
      .compile();

    appStoreService = moduleRef.get(AppStoreService);
    appStoreRepository = moduleRef.get(AppStoreRepository);
    config = moduleRef.get(ConfigurationService);
    logger = moduleRef.get(LoggerService);
    repoHelpers = moduleRef.get(ReposHelpers);
    repoQueue = moduleRef.get(RepoEventsQueue);
  });

  describe('migrateLegacyRepo', () => {
    it('should skip migration if no deprecated repo URL is provided', async () => {
      // Arrange
      config.getConfig.mockReturnValue(
        fromPartial({
          deprecatedAppsRepoUrl: undefined,
          deprecatedAppsRepoId: undefined,
        }),
      );

      // Act
      await appStoreService.migrateLegacyRepo();

      // Assert
      expect(logger.debug).toHaveBeenCalledWith('Skipping repo migration, no deprecated repo URL to migrate');
      expect(appStoreRepository.getAppStoreByHash).not.toHaveBeenCalled();
    });

    it('should use "legacy" hash when checking for existing app store', async () => {
      // Arrange
      const mockUrl = 'https://github.com/runtipi/runtipi-appstore';
      const mockId = 'legacy-repo-id';
      config.getConfig.mockReturnValue(
        fromPartial({
          deprecatedAppsRepoUrl: mockUrl,
          deprecatedAppsRepoId: mockId,
        }),
      );

      appStoreRepository.getAppStoreByHash.mockResolvedValue(
        fromPartial({
          slug: 'legacy',
          hash: 'legacy',
          name: 'legacy',
          url: mockUrl,
        }),
      );

      // Act
      await appStoreService.migrateLegacyRepo();

      // Assert
      expect(appStoreRepository.getAppStoreByHash).toHaveBeenCalledWith('legacy');
    });

    it('should update app store hash and URL if legacy store exists', async () => {
      // Arrange
      const mockUrl = 'https://github.com/runtipi/runtipi-appstore';
      const mockId = 'new-repo-hash';
      config.getConfig.mockReturnValue(
        fromPartial({
          deprecatedAppsRepoUrl: mockUrl,
          deprecatedAppsRepoId: mockId,
        }),
      );

      const mockExistingStore = fromPartial({
        slug: 'legacy',
        hash: 'legacy',
        name: 'legacy',
        url: 'old-url',
      });

      appStoreRepository.getAppStoreByHash.mockResolvedValue(mockExistingStore);

      // Act
      await appStoreService.migrateLegacyRepo();

      // Assert
      expect(appStoreRepository.updateAppStoreHashAndUrl).toHaveBeenCalledWith('legacy', {
        url: mockUrl,
        hash: mockId,
      });
      expect(logger.info).toHaveBeenCalledWith('Migrating default repo');
    });

    it('should not update if no legacy store exists', async () => {
      // Arrange
      const mockUrl = 'https://github.com/runtipi/runtipi-appstore';
      const mockId = 'legacy-repo-id';
      config.getConfig.mockReturnValue(
        fromPartial({
          deprecatedAppsRepoUrl: mockUrl,
          deprecatedAppsRepoId: mockId,
        }),
      );

      appStoreRepository.getAppStoreByHash.mockResolvedValue(null);

      // Act
      await appStoreService.migrateLegacyRepo();

      // Assert
      expect(appStoreRepository.updateAppStoreHashAndUrl).not.toHaveBeenCalled();
    });
  });

  describe('getEnabledAppStores', () => {
    it('should return enabled app stores', async () => {
      // Arrange
      const mockStores = [
        fromPartial({ slug: 'legacy', name: 'legacy', enabled: true }),
        fromPartial({ slug: 'custom', name: 'Custom Store', enabled: true }),
      ];
      appStoreRepository.getEnabledAppStores.mockResolvedValue(mockStores);

      // Act
      const result = await appStoreService.getEnabledAppStores();

      // Assert
      expect(result).toEqual(mockStores);
      expect(appStoreRepository.getEnabledAppStores).toHaveBeenCalled();
    });
  });

  describe('getAllAppStores', () => {
    it('should return all app stores', async () => {
      // Arrange
      const mockStores = [
        fromPartial({ slug: 'legacy', name: 'legacy', enabled: true }),
        fromPartial({ slug: 'custom', name: 'Custom Store', enabled: false }),
      ];
      appStoreRepository.getAllAppStores.mockResolvedValue(mockStores);

      // Act
      const result = await appStoreService.getAllAppStores();

      // Assert
      expect(result).toEqual(mockStores);
      expect(appStoreRepository.getAllAppStores).toHaveBeenCalled();
    });
  });
});
