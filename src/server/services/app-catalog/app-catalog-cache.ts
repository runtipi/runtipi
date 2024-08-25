import { TipiConfig } from '@/server/core/TipiConfig';
import type { AppDataService, IAppDataService } from '@runtipi/shared/node';
import MiniSearch from 'minisearch';

const sortApps = (a: AppList[number], b: AppList[number]) => a.id.localeCompare(b.id);
const filterApp = (app: AppList[number]): boolean => {
  if (app.deprecated) {
    return false;
  }

  if (!app.supported_architectures) {
    return true;
  }

  const { architecture } = TipiConfig.getConfig();
  return app.supported_architectures.includes(architecture);
};

type AppList = Awaited<ReturnType<InstanceType<typeof AppDataService>['getAllAvailableApps']>>;

export class AppCatalogCache {
  private appsAvailable: AppList | null = null;
  private miniSearch: MiniSearch<AppList[number]> | null = null;
  private cacheTimeout = 1000 * 60 * 15; // 15 minutes
  private cacheLastUpdated = 0;

  constructor(private appDataService: IAppDataService) {}

  public invalidateCache() {
    this.appsAvailable = null;
    if (this.miniSearch) {
      this.miniSearch.removeAll();
    }
  }

  private filterApps(apps: AppList): AppList {
    return apps.sort(sortApps).filter(filterApp);
  }

  public async getAvailableApps(): Promise<AppList> {
    if (this.cacheLastUpdated && Date.now() - this.cacheLastUpdated > this.cacheTimeout) {
      this.invalidateCache();
    }

    if (!this.appsAvailable) {
      const apps = await this.appDataService.getAllAvailableApps();
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

  public async searchApps(params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) {
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
    const end = start + pageSize;
    const data = filteredApps.slice(start, end);

    return { data, total: filteredApps.length, nextCursor: filteredApps[end]?.id };
  }
}
