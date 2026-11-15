import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { AppStoreRepository } from '@/modules/app-stores/app-store.repository';
import { ReposHelpers } from '@/modules/app-stores/repos.helpers';
import { RepoEventsQueue } from '@/modules/queue/entities/repo-events';
import { createMockAppStore } from '@/tests/helpers/app-mocks';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { MarketplaceService } from '../marketplace.service';

test.each(['pullRepositories', 'initialize', 'pullAppStores'] as const)('%s reports a failed enabled repository pull', async (method) => {
  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  const repository = mock<AppStoreRepository>();
  repository.getEnabledAppStores.mockResolvedValue([createMockAppStore({ slug: 'broken' })]);
  repository.getAllAppStores.mockResolvedValue([]);
  const repos = mock<ReposHelpers>();
  repos.pullRepo.mockResolvedValue({ success: false, message: 'Clone failed' });
  const stores = new AppStoreService(logger, mock<RepoEventsQueue>(), repos, config, repository);
  const marketplace = new MarketplaceService(config, mock<FilesystemService>(), logger, stores);

  let result: Promise<unknown>;
  if (method === 'pullRepositories') result = stores.pullRepositories();
  else result = marketplace[method]();
  await expect(result).rejects.toThrow('Could not refresh app store broken');
});
