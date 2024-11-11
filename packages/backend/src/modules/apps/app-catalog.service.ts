import { TranslatableError } from '@/common/error/translatable-error';
import { notEmpty, pLimit } from '@/common/helpers/file-helpers';
import { type Architecture, ConfigurationService } from '@/core/config/configuration.service';
import type { App } from '@/core/database/drizzle/types';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import MiniSearch from 'minisearch';
import { AppFilesManager } from './app-files-manager';
import { AppsRepository } from './apps.repository';

type AppList = Awaited<ReturnType<InstanceType<typeof AppCatalogService>['getAllAvailableApps']>>;

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
export class AppCatalogService {
  constructor(
    private readonly filesManager: AppFilesManager,
    private readonly configuration: ConfigurationService,
    private readonly appsRepository: AppsRepository,
    private readonly logger: LoggerService,
  ) {}

  private appsAvailable: AppList | null = null;
  private miniSearch: MiniSearch<AppList[number]> | null = null;
  private cacheTimeout = 1000 * 60 * 15; // 15 minutes
  private cacheLastUpdated = 0;

  private async constructSingleApp(app: App) {
    try {
      const info = await this.filesManager.getAppInfoFromAppStore(app.id);
      const updateInfo = await this.filesManager.getAppUpdateInfo(app.id);
      return info ? { app, info, updateInfo } : null;
    } catch (e) {
      return null;
    }
  }

  private async constructAppList(apps: App[]) {
    const limit = pLimit(10);

    const installedApps = await Promise.all(
      apps.map(async (app) => {
        return limit(() => this.constructSingleApp(app));
      }),
    );

    return installedApps.filter(notEmpty);
  }

  private async getAppInfoFromInstalledOrAppStore(id: string) {
    const info = await this.filesManager.getInstalledAppInfo(id);
    if (!info) {
      return this.filesManager.getAppInfoFromAppStore(id);
    }
    return info;
  }

  /**
   * Get all available apps from the catalog
   * @returns All available apps
   */
  private async getAllAvailableApps() {
    const appIds = await this.filesManager.getAvailableAppIds();

    const limit = pLimit(10);
    const apps = await Promise.all(
      appIds.map(async (app) => {
        return limit(() => this.filesManager.getAppInfoFromAppStore(app));
      }),
    );

    return apps.filter(notEmpty);
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
   * Filter the apps based on the architecture
   * @param apps - The apps to filter
   * @returns The filtered apps
   */
  private filterApps(apps: AppList): AppList {
    const { architecture } = this.configuration.getConfig();
    return apps.sort(sortApps).filter(filterApp(architecture));
  }

  /**
   * Get all available apps from the catalog
   * @returns All available apps
   */
  public async getAvailableApps(): Promise<AppList> {
    if (this.cacheLastUpdated && Date.now() - this.cacheLastUpdated > this.cacheTimeout) {
      this.invalidateCache();
    }

    if (!this.appsAvailable) {
      const apps = await this.getAllAvailableApps();
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
  public async searchApps(params: { search?: string | null; category?: string | null; pageSize?: number; cursor?: string | null }) {
    const { search, category, pageSize, cursor } = params;

    let filteredApps = await this.getAvailableApps();

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
   * @param id - The ID of the app
   * @returns The image of the app
   */
  public async getAppImage(id: string) {
    return this.filesManager.getAppImage(id);
  }

  public async getApp(appId: string) {
    let app = await this.appsRepository.getApp(appId);
    const info = await this.getAppInfoFromInstalledOrAppStore(appId);

    const updateInfo = await this.filesManager.getAppUpdateInfo(appId);

    if (!info) {
      throw new TranslatableError('APP_ERROR_INVALID_CONFIG', { id: appId });
    }

    if (!app) {
      app = {
        id: appId,
        status: 'missing',
        config: {},
        exposed: false,
        domain: '',
        version: 1,
        lastOpened: null,
        openPort: false,
        createdAt: '',
        numOpened: 0,
        updatedAt: '',
        exposedLocal: false,
        isVisibleOnGuestDashboard: false,
      } satisfies App;
    }

    return { app, updateInfo, info };
  }

  /**
   * Get the installed apps
   */
  public async getInstalledApps() {
    const apps = await this.appsRepository.getApps();
    return this.constructAppList(apps);
  }

  public async getGuestDashboardApps() {
    this.logger.debug('Getting guest dashboard apps');
    const apps = await this.appsRepository.getGuestDashboardApps();
    this.logger.debug(`Got ${apps.length} guest dashboard apps`);

    return this.constructAppList(apps);
  }
}
