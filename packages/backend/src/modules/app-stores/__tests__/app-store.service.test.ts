import { AppStoreRepository } from '@/modules/app-stores/app-store.repository';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { ReposHelpers } from '@/modules/app-stores/repos.helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { RepoEventsQueue } from '@/modules/queue/entities/repo-events';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { fromAny } from '@total-typescript/shoehorn';

describe('AppStoreService', () => {
  let appStoreService: AppStoreService;
  let appStoreRepository: MockProxy<AppStoreRepository>;
  let repoHelpers: MockProxy<ReposHelpers>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppStoreService],
    })
      .useMocker(mock)
      .compile();

    appStoreService = moduleRef.get(AppStoreService);
    appStoreRepository = moduleRef.get(AppStoreRepository);
    repoHelpers = moduleRef.get(ReposHelpers);
    moduleRef.get(LoggerService);
    moduleRef.get(RepoEventsQueue);
    moduleRef.get(ConfigurationService);
  });

  it('rejects deleting an unknown app store slug before removing any repo', async () => {
    appStoreRepository.getAllAppStores.mockResolvedValue([
      fromAny({ slug: 'primary', url: 'https://example.com/primary.git', hash: 'primary', name: 'Primary', enabled: true }),
      fromAny({ slug: 'secondary', url: 'https://example.com/secondary.git', hash: 'secondary', name: 'Secondary', enabled: true }),
    ]);

    await expect(appStoreService.deleteAppStore('..')).rejects.toBeInstanceOf(NotFoundException);

    expect(appStoreRepository.removeAppStoreEntity).not.toHaveBeenCalled();
    expect(repoHelpers.deleteRepo).not.toHaveBeenCalled();
  });

  it('rejects creating an app store when slugify produces an unsafe slug', async () => {
    repoHelpers.getRepoHash.mockReturnValue('hash');
    appStoreRepository.getAppStoreByHash.mockResolvedValue(undefined);

    await expect(appStoreService.createAppStore({ name: '..', url: 'https://example.com/store.git' })).rejects.toBeInstanceOf(BadRequestException);

    expect(appStoreRepository.getAppStoreBySlug).not.toHaveBeenCalled();
    expect(appStoreRepository.createAppStore).not.toHaveBeenCalled();
    expect(repoHelpers.cloneRepo).not.toHaveBeenCalled();
  });
});
