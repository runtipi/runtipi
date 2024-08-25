import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import type { IAppDataService } from '@runtipi/shared/node';
import { AppCatalogCache } from './app-catalog-cache';
import { inject, injectable } from 'inversify';
import { notEmpty } from '@/server/common/typescript.helpers';
import type { App } from 'packages/db/src';
import { TranslatedError } from '@/server/utils/errors';

export interface IAppCatalogService {
  searchApps: AppCatalogService['searchApps'];
  listApps: AppCatalogService['listApps'];
  getInstalledApps: AppCatalogService['getInstalledApps'];
  getGuestDashboardApps: AppCatalogService['getGuestDashboardApps'];
  getApp: AppCatalogService['getApp'];
  invalidateCache: AppCatalogService['invalidateCache'];
}

@injectable()
export class AppCatalogService implements IAppCatalogService {
  private appCatalogCache: AppCatalogCache;

  constructor(
    @inject('IAppQueries') private queries: IAppQueries,
    @inject('IAppDataService') private appDataService: IAppDataService,
  ) {
    this.appCatalogCache = new AppCatalogCache(appDataService);
  }

  private async constructSingleApp(app: App) {
    try {
      const info = await this.appDataService.getInstalledInfo(app.id);
      const updateInfo = await this.appDataService.getUpdateInfo(app.id);
      return info ? { ...app, ...updateInfo, info } : null;
    } catch (e) {
      return null;
    }
  }

  private async constructAppList(apps: App[]) {
    const appPromises = apps.map((app) => this.constructSingleApp(app));
    const constructedApps = await Promise.all(appPromises);
    return constructedApps.filter(notEmpty);
  }

  public async searchApps(params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) {
    return this.appCatalogCache.searchApps(params);
  }

  public async listApps() {
    const apps = await this.appCatalogCache.getAvailableApps();
    return { apps, total: apps.length };
  }

  public async getInstalledApps() {
    const apps = await this.queries.getApps();
    return this.constructAppList(apps);
  }

  public async getGuestDashboardApps() {
    const apps = await this.queries.getGuestDashboardApps();
    return this.constructAppList(apps);
  }

  public async getApp(appId: string) {
    let app = await this.queries.getApp(appId);
    const info = await this.appDataService.getAppInfoFromInstalledOrAppStore(appId);
    const updateInfo = await this.appDataService.getUpdateInfo(appId);

    if (!info) {
      throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id: appId });
    }

    if (!app) {
      app = { id: appId, status: 'missing', config: {}, exposed: false, domain: '' } as App;
    }
    return { ...app, ...updateInfo, info };
  }

  public invalidateCache() {
    this.appCatalogCache.invalidateCache();
  }
}
