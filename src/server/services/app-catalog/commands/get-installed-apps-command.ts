import { notEmpty } from '@/server/common/typescript.helpers';
import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetInstalledAppsCommand>['execute']>>;

export class GetInstalledAppsCommand implements IAppCatalogCommand<ReturnValue> {
  constructor(private params: AppCatalogCommandParams) {}

  async execute() {
    const apps = await this.params.queries.getApps();

    const installedApps = await Promise.all(
      apps.map(async (app) => {
        try {
          const info = await this.params.appDataService.getInstalledInfo(app.id);
          const updateInfo = await this.params.appDataService.getUpdateInfo(app.id);
          if (info) {
            return { ...app, ...updateInfo, info };
          }
        } catch (e) {
          return null;
        }
      }),
    );

    return installedApps.filter(notEmpty);
  }
}
