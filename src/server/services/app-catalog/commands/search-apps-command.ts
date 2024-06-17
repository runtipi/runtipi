import { AppCatalogCache } from '../app-catalog-cache';
import { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof SearchAppsCommand>['execute']>>;

export class SearchAppsCommand implements IAppCatalogCommand<ReturnValue> {
  private appCatalogCache: AppCatalogCache;

  constructor(params: AppCatalogCommandParams) {
    this.appCatalogCache = params.appCatalogCache;
  }

  async execute(params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) {
    return this.appCatalogCache.searchApps(params);
  }
}
