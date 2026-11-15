import { DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { createMockAppStore } from '@/tests/helpers/app-mocks';
import { createAppInStore } from '@/tests/utils/create-app-in-store';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { MarketplaceService } from '../marketplace.service';

const setup = async () => {
  await createAppInStore('store', { id: 'demo', name: 'Demo', supported_architectures: ['amd64'] });
  const original = createMockAppStore({ slug: 'store', enabled: true });
  let saved = [original];
  const stores = mock<AppStoreService>();
  stores.getAllAppStores.mockImplementation(async () => saved);
  stores.updateAppStore.mockImplementation(async (_id, settings) => {
    const updated = { ...original, ...settings };
    saved = [updated];
    return updated;
  });
  stores.deleteAppStore.mockImplementation(async () => {
    saved = [];
    return { success: true };
  });
  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(fromPartial({ architecture: 'amd64', directories: { dataDir: DATA_DIR, appDataDir: '/app-data' } }));
  const logger = mock<LoggerService>();
  const filesystem = new FilesystemService(logger);
  const marketplace = new MarketplaceService(config, filesystem, logger, stores);
  await marketplace.initialize();

  return { stores, original, filesystem, marketplace };
};

test('a superseded explicit refresh still reports repository pull failure', async () => {
  const { stores, original, marketplace } = await setup();
  const read = Promise.withResolvers<(typeof original)[]>();
  stores.getAllAppStores.mockReturnValueOnce(read.promise);
  const refresh = marketplace.pullAppStores();
  const result = refresh.catch((error: unknown) => error);
  try {
    stores.getAllAppStores.mockRejectedValueOnce(new Error('Database unavailable'));
    await marketplace.updateAppStore('store', { name: original.name, enabled: false });
    stores.pullRepositories.mockRejectedValueOnce(new Error('Repository unavailable'));
    read.resolve([original]);

    expect(await result).toMatchObject({ message: 'Repository unavailable' });
    expect(await marketplace.getAvailableAppUrns()).toEqual([]);
  } finally {
    read.resolve([original]);
    await result;
  }
});

test.each([
  ['disable', 'metadata'],
  ['delete', 'metadata'],
  ['disable', 'directories'],
  ['delete', 'directories'],
] as const)('a %s cannot be undone by a catalog waiting for %s', async (mutation, phase) => {
  const { original, filesystem, marketplace } = await setup();
  const started = Promise.withResolvers<void>();
  const gate = Promise.withResolvers<void>();
  if (phase === 'metadata') {
    const read = filesystem.readTextFile.bind(filesystem);
    vi.spyOn(filesystem, 'readTextFile').mockImplementation(async (path) => {
      const content = await read(path);
      if (path.endsWith('/demo/config.json')) {
        started.resolve();
        await gate.promise;
      }
      return content;
    });
  } else {
    const list = filesystem.listFiles.bind(filesystem);
    vi.spyOn(filesystem, 'listFiles').mockImplementation(async (path) => {
      const entries = await list(path);
      started.resolve();
      await gate.promise;
      return entries;
    });
  }

  const pending = marketplace.searchApps({ search: 'Demo' });
  const result = pending.catch((error: unknown) => error);
  try {
    await started.promise;
    if (mutation === 'disable') await marketplace.updateAppStore('store', { name: original.name, enabled: false });
    else await marketplace.deleteAppStore('store');
    gate.resolve();

    expect(await result).toMatchObject({ data: [], total: 0 });
    expect(await marketplace.getAvailableApps()).toEqual([]);
    expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ data: [], total: 0 });
  } finally {
    gate.resolve();
    await result;
  }
});

test('a cached search retains its matching index when another store is disabled concurrently', async () => {
  const { stores, original, marketplace } = await setup();
  const other = createMockAppStore({ slug: 'other', enabled: true });
  stores.getAllAppStores.mockResolvedValueOnce([original, other]);
  await marketplace.initialize();
  expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ total: 1 });

  const disabled = { ...other, enabled: false };
  stores.updateAppStore.mockResolvedValueOnce(disabled);
  stores.getAllAppStores.mockResolvedValueOnce([original, disabled]);
  const mutation = marketplace.updateAppStore('other', { name: other.name, enabled: false });
  const search = marketplace.searchApps({ search: 'Demo' });
  try {
    expect(await search).toMatchObject({ data: [{ urn: 'demo:store' }], total: 1 });
  } finally {
    await mutation;
  }
  expect(await marketplace.searchApps({ search: 'Demo' })).toMatchObject({ data: [{ urn: 'demo:store' }], total: 1 });
});

test('overlapping requests after cache expiry share one catalog load', async () => {
  const { filesystem, marketplace } = await setup();
  const started = Promise.withResolvers<void>();
  const gate = Promise.withResolvers<void>();
  const pending: ReturnType<MarketplaceService['getAvailableApps']>[] = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    await marketplace.getAvailableApps();
    const read = filesystem.readTextFile.bind(filesystem);
    let metadataReads = 0;
    vi.spyOn(filesystem, 'readTextFile').mockImplementation(async (path) => {
      const content = await read(path);
      if (path.endsWith('/demo/config.json')) {
        metadataReads++;
        started.resolve();
        await gate.promise;
      }
      return content;
    });

    vi.setSystemTime(new Date('2026-11-15T12:16:00Z'));
    pending.push(marketplace.getAvailableApps());
    await started.promise;
    for (let index = 1; index <= 4; index++) {
      vi.setSystemTime(Date.now() + 50);
      pending.push(marketplace.getAvailableApps());
    }
    gate.resolve();

    for (const apps of await Promise.all(pending)) expect(apps).toMatchObject([{ urn: 'demo:store' }]);
    expect(metadataReads).toBe(1);
  } finally {
    gate.resolve();
    await Promise.allSettled(pending);
    vi.useRealTimers();
  }
});

test('a failed shared catalog load can be retried', async () => {
  const { filesystem, marketplace } = await setup();
  vi.spyOn(filesystem, 'listFiles').mockRejectedValueOnce(new Error('Directory read failed'));
  await expect(marketplace.getAvailableApps()).rejects.toThrow('Directory read failed');
  expect(await marketplace.getAvailableApps()).toMatchObject([{ urn: 'demo:store' }]);
});
