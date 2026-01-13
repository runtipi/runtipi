import type { Architecture } from '@/common/constants';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { notEmpty, pLimit } from '@/common/helpers/file-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import MiniSearch from 'minisearch';
import { AppStoreService } from '../app-stores/app-store.service';
import { AppPathsService } from '../apps/app-paths.service';
import { AppSourceFactory } from '../apps/sources/app-source.factory';

type AppList = Awaited<ReturnType<InstanceType<typeof MarketplaceService>['getAllAppFromStores']>>;

const sortApps = (a: AppList[number], b: AppList[number]) => a.urn.localeCompare(b.urn);
const filterApp =
  (architecture: Architecture) =>
  (app: AppList[number]): boolean => {
    if (app.deprecated) {
      return false;
    }

    if (!app.supported_architectures?.length) {
      return true;
    }

    return app.supported_architectures.includes(architecture);
  };

@Injectable()
export class MarketplaceService {
  private appsAvailable: AppList | null = null;
  private miniSearch: MiniSearch<AppList[number]> | null = null;
  private cacheTimeout = 1000 * 60 * 15; // 15 minutes
  private cacheLastUpdated = 0;

  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private readonly appStoreService: AppStoreService,
    private readonly appPaths: AppPathsService,
    private readonly appSourceFactory: AppSourceFactory,
  ) {}

  async initialize() {
    await this.appStoreService.pullRepositories();
    this.invalidateCache();

    this.logger.debug('Marketplace service initialized');
  }

  async getAppInfoFromAppStore(appUrn: AppUrn) {
    const source = this.appSourceFactory.getSource(appUrn);
    return source.getAppInfo();
  }

  async getAppInfoFromAppStoreOrInstalled(appUrn: AppUrn) {
    const info = await this.getAppInfoFromAppStore(appUrn);
    if (info) {
      return info;
    }

    const source = this.appSourceFactory.getInstalledSource(appUrn);
    return source.getAppInfo();
  }

  async getAvailableAppUrns(): Promise<AppUrn[]> {
    const stores = await this.appStoreService.getAllAppStores();
    const allUrns: AppUrn[] = [];

    for (const store of stores) {
      if (store.enabled) {
        const urns = await this.appStoreService.getAvailableAppUrns(store.slug);
        allUrns.push(...urns);
      }
    }
    return allUrns.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Get all available apps from the catalog
   * @returns All available apps
   */
  private async getAllAppFromStores() {
    const appUrns = await this.getAvailableAppUrns();

    const limit = pLimit(10);
    const apps = await Promise.all(
      appUrns.map(async (appUrn) => {
        return limit(() => this.getAppInfoFromAppStore(appUrn));
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

    if (!this.appsAvailable?.length) {
      const apps = await this.getAllAppFromStores();

      this.appsAvailable = this.filterApps(apps);

      this.miniSearch = new MiniSearch<(typeof this.appsAvailable)[number]>({
        fields: ['name', 'short_desc', 'categories'],
        storeFields: ['urn'],
        idField: 'urn',
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
  public async searchApps(params: { search?: string | null; category?: string | null; pageSize?: number; cursor?: string | null; storeId?: string }) {
    const { search, category, pageSize, cursor, storeId } = params;

    let filteredApps = await this.getAvailableApps();

    if (storeId) {
      filteredApps = filteredApps.filter((app) => {
        const { appStoreId } = extractAppUrn(app.urn);
        return appStoreId === storeId;
      });
    }

    if (category) {
      filteredApps = filteredApps.filter((app) => app.categories.some((c) => c === category));
    }

    if (search && this.miniSearch) {
      const result = this.miniSearch.search(search);
      const searchIds = result.map((app) => app.id);
      filteredApps = filteredApps.filter((app) => searchIds.includes(app.urn)).sort((a, b) => searchIds.indexOf(a.urn) - searchIds.indexOf(b.urn));
    }

    const start = cursor ? filteredApps.findIndex((app) => app.urn === cursor) : 0;
    const end = start + (pageSize ?? 24);
    const data = filteredApps.slice(start, end);

    return {
      data,
      total: filteredApps.length,
      nextCursor: filteredApps[end]?.urn ?? null,
    };
  }

  /**
   * Get the image of an app
   * @param appUrn - The ID of the app
   * @returns The image of the app
   */
  public async getAppImage(appUrn: AppUrn) {
    const source = this.appSourceFactory.getSource(appUrn);
    const logo = await source.getLogo();

    if (!logo) {
      const installedSource = this.appSourceFactory.getInstalledSource(appUrn);
      return installedSource.getLogo();
    }

    return logo;
  }

  public async getAppUpdateInfo(appUrn: AppUrn) {
    const source = this.appSourceFactory.getSource(appUrn);
    const config = await source.getAppInfo();
    const paths = this.appPaths.getAppPaths(appUrn);

    if (config) {
      return {
        ...paths,
        latestVersion: config.tipi_version,
        minTipiVersion: config.min_tipi_version ?? null,
        latestDockerVersion: config.version,
      };
    }

    return {
      latestVersion: 0,
      latestDockerVersion: '0.0.0',
      minTipiVersion: null,
      ...paths,
    };
  }

  public async getSourceDockerComposeYaml(appUrn: AppUrn) {
    const source = this.appSourceFactory.getSource(appUrn);
    return {
      path: this.appPaths.getAppComposePath(this.appPaths.getAppRepoDir(appUrn)),
      content: await source.getCompose(),
    };
  }

  public async getConfigJson(appUrn: AppUrn) {
    const configPath = this.appPaths.getAppConfigPath(this.appPaths.getAppRepoDir(appUrn));

    let content = null;
    try {
      if (await this.filesystem.pathExists(configPath)) {
        content = await this.filesystem.readJsonFile(configPath);
      }
    } catch (error) {
      this.logger.error(`Error getting config.json for app ${appUrn}:`, error);
    }

    return { path: configPath, content };
  }
}
