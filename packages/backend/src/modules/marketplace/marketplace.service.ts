import type { Architecture } from '@/common/constants';
import { extractAppId } from '@/common/helpers/app-helpers';
import { notEmpty, pLimit } from '@/common/helpers/file-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@/types/app/app.types';
import { Injectable } from '@nestjs/common';
import MiniSearch from 'minisearch';
import { AppStoreFilesManager } from '../app-stores/app-store-files-manager';
import { AppStoreService } from '../app-stores/app-store.service';

type AppList = Awaited<ReturnType<InstanceType<typeof MarketplaceService>['getAllAppFromStores']>>;

const sortApps = (a: AppList[number], b: AppList[number]) => a.id.localeCompare(b.id);
const filterApp =
  (architecture: Architecture) =>
  (app: AppList[number]): boolean => {
    if (app.deprecated) {
      return false;
    }

    if (!app.supported_architectures) {
      return true;
    }

    return app.supported_architectures.includes(architecture);
  };

@Injectable()
export class MarketplaceService {
  private stores: Map<string, AppStoreFilesManager> = new Map();
  private appsAvailable: AppList | null = null;
  private miniSearch: MiniSearch<AppList[number]> | null = null;
  private cacheTimeout = 1000 * 60 * 15; // 15 minutes
  private cacheLastUpdated = 0;

  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private readonly appStoreService: AppStoreService,
  ) {}

  async initialize() {
    this.stores.clear();

    const stores = await this.appStoreService.getEnabledAppStores();

    for (const config of stores) {
      const store = new AppStoreFilesManager(this.configuration, this.filesystem, this.logger, config.slug);
      this.stores.set(config.slug, store);
    }

    await this.appStoreService.pullRepositories();
    this.invalidateCache();

    this.logger.debug('Marketplace service initialized with stores', Array.from(this.stores.keys()).join(', '));
  }

  private extractStoreFromNamespacedId(appUrn: AppUrn) {
    const { storeId } = extractAppId(appUrn);

    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    return { store };
  }

  async getAppInfoFromAppStore(appUrn: AppUrn) {
    const { store } = this.extractStoreFromNamespacedId(appUrn);

    return store.getAppInfoFromAppStore(appUrn);
  }

  async getAvailableAppIds(): Promise<AppUrn[]> {
    const allIds: AppUrn[] = [];
    for (const store of this.stores.values()) {
      const ids = await store.getAvailableAppIds();
      allIds.push(...ids);
    }
    return allIds.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Get all available apps from the catalog
   * @returns All available apps
   */
  private async getAllAppFromStores() {
    const appIds = await this.getAvailableAppIds();

    const limit = pLimit(10);
    const apps = await Promise.all(
      appIds.map(async (appUrn) => {
        return limit(() => {
          const { store } = this.extractStoreFromNamespacedId(appUrn);
          return store.getAppInfoFromAppStore(appUrn);
        });
      }),
    );

    return apps.filter(notEmpty);
  }

  /**
   * Filter the apps based on the architecture
   * @param apps - The apps to filter
   * @returns The filtered apps
   */
  private filterApps(apps: AppList): AppList {
    const { architecture } = this.configuration.getConfig();
    return apps.sort(sortApps).filter(filterApp(architecture));
  }

  /**
   * Invalidate the cache
   */
  private invalidateCache() {
    this.appsAvailable = null;
    if (this.miniSearch) {
      this.miniSearch.removeAll();
    }
  }

  /**
   * Get all available apps from all stores
   * @returns All available apps
   */
  public async getAvailableApps(): Promise<AppList> {
    if (this.cacheLastUpdated && Date.now() - this.cacheLastUpdated > this.cacheTimeout) {
      this.invalidateCache();
    }

    if (!this.appsAvailable) {
      const apps = await this.getAllAppFromStores();
      this.appsAvailable = this.filterApps(apps);

      this.miniSearch = new MiniSearch<(typeof this.appsAvailable)[number]>({
        fields: ['name', 'short_desc', 'categories'],
        storeFields: ['id'],
        idField: 'id',
        searchOptions: {
          boost: { name: 2 },
          fuzzy: 0.2,
          prefix: true,
        },
      });
      this.miniSearch.addAll(this.appsAvailable);

      this.cacheLastUpdated = Date.now();
    }

    return this.appsAvailable;
  }

  /**
   * Search for apps in the catalog
   * @param params - The search parameters
   * @returns The search results
   */
  public async searchApps(params: { search?: string | null; category?: string | null; pageSize?: number; cursor?: string | null; storeId?: number }) {
    const { search, category, pageSize, cursor, storeId } = params;

    let filteredApps = await this.getAvailableApps();

    if (storeId) {
      filteredApps = filteredApps.filter((app) => {
        const { storeId: appStoreId } = extractAppId(app.id);
        return appStoreId === storeId.toString();
      });
    }

    if (category) {
      filteredApps = filteredApps.filter((app) => app.categories.some((c) => c === category));
    }

    if (search && this.miniSearch) {
      const result = this.miniSearch.search(search);
      const searchIds = result.map((app) => app.id);
      filteredApps = filteredApps.filter((app) => searchIds.includes(app.id)).sort((a, b) => searchIds.indexOf(a.id) - searchIds.indexOf(b.id));
    }

    const start = cursor ? filteredApps.findIndex((app) => app.id === cursor) : 0;
    const end = start + (pageSize ?? 24);
    const data = filteredApps.slice(start, end);

    return { data, total: filteredApps.length, nextCursor: filteredApps[end]?.id };
  }

  /**
   * Get the image of an app
   * @param appUrn - The ID of the app
   * @returns The image of the app
   */
  public async getAppImage(appUrn: AppUrn) {
    const { store } = this.extractStoreFromNamespacedId(appUrn);
    return store.getAppImage(appUrn);
  }

  public async getAppUpdateInfo(appUrn: AppUrn) {
    const { store } = this.extractStoreFromNamespacedId(appUrn);
    return store.getAppUpdateInfo(appUrn);
  }

  public async copyAppFromRepoToInstalled(appUrn: AppUrn) {
    const { store } = this.extractStoreFromNamespacedId(appUrn);
    return store.copyAppFromRepoToInstalled(appUrn);
  }

  public async copyDataDir(appUrn: AppUrn, envMap: Map<string, string>) {
    const { store } = this.extractStoreFromNamespacedId(appUrn);
    return store.copyDataDir(appUrn, envMap);
  }
}
