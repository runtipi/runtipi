import { notEmpty } from '@/server/common/typescript.helpers';
import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetGuestDashboardApps>['execute']>>;

export class GetGuestDashboardApps implements IAppCatalogCommand<ReturnValue> {
  constructor(private params: AppCatalogCommandParams) {}

  async execute() {
    const apps = await this.params.queries.getGuestDashboardApps();

    const guestApps = await Promise.all(
      apps.map(async (app) => {
        try {
          const info = await this.params.appDataService.getInstalledInfo(app.id);
          if (info) {
            return { ...app, info };
          }
        } catch (e) {
          return null;
        }
      }),
    );

    return guestApps.filter(notEmpty);
  }
}
