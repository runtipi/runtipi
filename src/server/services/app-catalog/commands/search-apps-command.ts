import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof SearchAppsCommand>['execute']>>;

export class SearchAppsCommand implements IAppCatalogCommand<ReturnValue> {
  constructor(private params: AppCatalogCommandParams) {}

  async execute(params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) {
    return this.params.appCatalogCache.searchApps(params);
  }
}
