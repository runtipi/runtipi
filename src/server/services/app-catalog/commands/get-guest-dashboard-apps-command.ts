import { AppQueries } from '@/server/queries/apps/apps.queries';
import { getInstalledAppInfo } from '../apps.helpers';
import { notEmpty } from '@/server/common/typescript.helpers';
import { AppCatalogCommandParams, ICommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetGuestDashboardApps>['execute']>>;

export class GetGuestDashboardApps implements ICommand<ReturnValue> {
  private queries: AppQueries;

  constructor(params: AppCatalogCommandParams) {
    this.queries = params.queries;
  }

  async execute() {
    const apps = await this.queries.getGuestDashboardApps();

    return apps
      .map((app) => {
        try {
          const info = getInstalledAppInfo(app.id);
          if (info) {
            return { ...app, info };
          }
        } catch (e) {
          return null;
        }
      })
      .filter(notEmpty);
  }
}
