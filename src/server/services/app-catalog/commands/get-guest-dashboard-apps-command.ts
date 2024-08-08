import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { notEmpty } from '@/server/common/typescript.helpers';
import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';
import type { AppDataService } from '@runtipi/shared/node';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetGuestDashboardApps>['execute']>>;

export class GetGuestDashboardApps implements IAppCatalogCommand<ReturnValue> {
  private queries: IAppQueries;
  private appDataService: AppDataService;

  constructor(params: AppCatalogCommandParams) {
    this.queries = params.queries;
    this.appDataService = params.appDataService;
  }

  async execute() {
    const apps = await this.queries.getGuestDashboardApps();

    const guestApps = await Promise.all(
      apps.map(async (app) => {
        try {
          const info = await this.appDataService.getInstalledInfo(app.id);
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
