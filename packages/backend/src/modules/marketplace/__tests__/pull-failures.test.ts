import { DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { AppStoreRepository } from '@/modules/app-stores/app-store.repository';
import { ReposHelpers } from '@/modules/app-stores/repos.helpers';
import { RepoEventsQueue } from '@/modules/queue/entities/repo-events';
import { createMockAppStore } from '@/tests/helpers/app-mocks';
import { createAppInStore } from '@/tests/utils/create-app-in-store';
import { fromPartial } from '@total-typescript/shoehorn';
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

test.each(['failure result', 'exception'])(
  'refreshes healthy stores and the cached search catalog after another store returns %s',
  async (failure) => {
    await createAppInStore('healthy', { id: 'demo', name: 'Before', short_desc: 'Original catalog entry', supported_architectures: ['amd64'] });
    const logger = mock<LoggerService>();
    const config = mock<ConfigurationService>();
    config.getConfig.mockReturnValue(fromPartial({ architecture: 'amd64', directories: { dataDir: DATA_DIR, appDataDir: '/app-data' } }));
    const repository = mock<AppStoreRepository>();
    const enabled = ['broken', 'healthy', 'also-broken'].map((slug) => createMockAppStore({ slug }));
    repository.getEnabledAppStores.mockResolvedValue(enabled);
    repository.getAllAppStores.mockResolvedValue(enabled);
    const repos = mock<ReposHelpers>();
    repos.pullRepo.mockResolvedValue({ success: true, message: 'Updated' });
    const stores = new AppStoreService(logger, mock<RepoEventsQueue>(), repos, config, repository);
    const marketplace = new MarketplaceService(config, new FilesystemService(logger), logger, stores);
    await marketplace.initialize();
    expect(await marketplace.searchApps({ search: 'Before' })).toMatchObject({ data: [{ urn: 'demo:healthy', name: 'Before' }], total: 1 });

    repos.pullRepo.mockImplementation(async (_url, slug) => {
      if (slug === 'broken' && failure === 'exception') throw new Error('Git fetch failed');
      if (slug !== 'healthy') return { success: false, message: 'Clone failed' };

      await createAppInStore('healthy', { id: 'demo', name: 'After', short_desc: 'Updated catalog entry', supported_architectures: ['amd64'] });
      return { success: true, message: 'Updated' };
    });
    await expect(marketplace.pullAppStores()).rejects.toThrow('Could not refresh app stores broken, also-broken');

    expect(await marketplace.searchApps({ search: 'After' })).toMatchObject({ data: [{ urn: 'demo:healthy', name: 'After' }], total: 1 });
    expect(await marketplace.searchApps({ search: 'Before' })).toMatchObject({ data: [], total: 0 });
  },
);
