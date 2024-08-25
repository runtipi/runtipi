import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof ListAppsCommand>['execute']>>;

export class ListAppsCommand implements IAppCatalogCommand<ReturnValue> {
  constructor(private params: AppCatalogCommandParams) {}

  async execute() {
    const apps = await this.params.appCatalogCache.getAvailableApps();
    return { apps, total: apps.length };
  }
}
