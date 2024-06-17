import { AppCatalogCache } from '../app-catalog-cache';
import { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof ListAppsCommand>['execute']>>;

export class ListAppsCommand implements IAppCatalogCommand<ReturnValue> {
  private appCatalogCache: AppCatalogCache;

  constructor(params: AppCatalogCommandParams) {
    this.appCatalogCache = params.appCatalogCache;
  }

  async execute() {
    const apps = await this.appCatalogCache.getAvailableApps();
    return { apps, total: apps.length };
  }
}
