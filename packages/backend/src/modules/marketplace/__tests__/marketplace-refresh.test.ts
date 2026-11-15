import { DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
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
