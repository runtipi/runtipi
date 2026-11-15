import { DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppStoreRepository } from '@/modules/app-stores/app-store.repository';
import { ReposHelpers } from '@/modules/app-stores/repos.helpers';
import { RepoEventsQueue } from '@/modules/queue/entities/repo-events';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { createMockAppStore } from '@/tests/helpers/app-mocks';
import { createAppInStore } from '@/tests/utils/create-app-in-store';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { MarketplaceService } from '../marketplace.service';

test('refreshes the cached search catalog after disabling an app store', async () => {
  await createAppInStore('store', { id: 'demo', name: 'Demo', supported_architectures: ['amd64'] });
  let store = createMockAppStore({ slug: 'store', enabled: true });
  const stores = mock<AppStoreService>();
  stores.getAllAppStores.mockImplementation(async () => [store]);
  stores.updateAppStore.mockImplementation(async (_id, settings) => {
    store = { ...store, ...settings };
    return store;
  });
  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(fromPartial({ architecture: 'amd64', directories: { dataDir: DATA_DIR, appDataDir: '/app-data' } }));
  const logger = mock<LoggerService>();
  const marketplace = new MarketplaceService(config, new FilesystemService(logger), logger, stores);
  await marketplace.initialize();
  expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ data: [{ urn: 'demo:store' }], total: 1 });

  await marketplace.updateAppStore('store', { name: store.name, enabled: false });

  expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ data: [], total: 0 });
});

test('an older initialization cannot restore a disabled store and keeps the catalog available while reading', async () => {
  await createAppInStore('store', { id: 'demo', name: 'Demo', supported_architectures: ['amd64'] });
  let store = createMockAppStore({ slug: 'store', enabled: true });
  const stores = mock<AppStoreService>();
  stores.getAllAppStores.mockImplementation(async () => [store]);
  stores.updateAppStore.mockImplementation(async (_id, settings) => {
    store = { ...store, ...settings };
    return store;
  });
  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(fromPartial({ architecture: 'amd64', directories: { dataDir: DATA_DIR, appDataDir: '/app-data' } }));
  const logger = mock<LoggerService>();
  const marketplace = new MarketplaceService(config, new FilesystemService(logger), logger, stores);
  await marketplace.initialize();
  const previous = store;
  const read = Promise.withResolvers<(typeof store)[]>();
  stores.getAllAppStores.mockReturnValueOnce(read.promise);
  const older = marketplace.initialize();

  try {
    expect(await marketplace.getAvailableAppUrns()).toEqual(['demo:store']);
    await marketplace.updateAppStore('store', { name: store.name, enabled: false });
    expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ data: [], total: 0 });
  } finally {
    read.resolve([previous]);
    await older;
  }

  expect(await marketplace.getAvailableAppUrns()).toEqual([]);
  expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ data: [], total: 0 });
});

test.each(['create', 'update', 'delete'] as const)('a successful store %s stays successful when another store cannot refresh', async (mutation) => {
  await createAppInStore('target', { id: 'demo', name: 'Demo', supported_architectures: ['amd64'] });
  const target = createMockAppStore({ slug: 'target' });
  const broken = createMockAppStore({ slug: 'broken' });
  let saved = mutation === 'create' ? [broken] : [broken, target];
  const repository = mock<AppStoreRepository>();
  repository.getAllAppStores.mockImplementation(async () => saved);
  repository.getEnabledAppStores.mockImplementation(async () => saved.filter((store) => store.enabled));
  repository.createAppStore.mockImplementation(async () => {
    saved = [...saved, target];
    return target;
  });
  repository.updateAppStore.mockImplementation(async () => {
    const updated = { ...target, enabled: false };
    saved = [broken, updated];
    return updated;
  });
  repository.removeAppStoreEntity.mockImplementation(async () => {
    saved = [broken];
    return fromPartial({});
  });

  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(fromPartial({ architecture: 'amd64', directories: { dataDir: DATA_DIR, appDataDir: '/app-data' } }));
  const repos = mock<ReposHelpers>();
  repos.cloneRepo.mockResolvedValue({ success: true, message: 'Cloned' });
  repos.pullRepo.mockImplementation(async (_url, slug) => ({ success: slug !== 'broken', message: 'Refresh result' }));
  const stores = new AppStoreService(logger, mock<RepoEventsQueue>(), repos, config, repository);
  const marketplace = new MarketplaceService(config, new FilesystemService(logger), logger, stores);

  if (mutation === 'create') {
    await expect(marketplace.createAppStore({ name: 'Target', url: 'https://example.com/target' })).resolves.toEqual(target);
    expect(saved).toContainEqual(target);
    expect(await marketplace.getAvailableAppUrns()).toEqual(['demo:target']);
  } else if (mutation === 'update') {
    await expect(marketplace.updateAppStore('target', { name: 'Target', enabled: false })).resolves.toBeUndefined();
    expect(saved).toContainEqual({ ...target, enabled: false });
    expect(await marketplace.getAvailableAppUrns()).toEqual([]);
  } else {
    await expect(marketplace.deleteAppStore('target')).resolves.toBeUndefined();
    expect(saved).toEqual([broken]);
    expect(await marketplace.getAvailableAppUrns()).toEqual([]);
  }

  await expect(marketplace.pullAppStores()).rejects.toThrow('Could not refresh app store broken');
});
