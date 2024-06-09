import { AppQueries } from '@/server/queries/apps/apps.queries';
import { getAppInfo } from '../apps.helpers';
import { notEmpty } from '@/server/common/typescript.helpers';
import { ICommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetGuestDashboardApps>['execute']>>;

export class GetGuestDashboardApps implements ICommand<ReturnValue> {
  constructor(private queries: AppQueries) {}

  async execute() {
    const apps = await this.queries.getGuestDashboardApps();

    return apps
      .map((app) => {
        const info = getAppInfo(app.id, app.status);
        if (info) {
          return { ...app, info };
        }
        return null;
      })
      .filter(notEmpty);
  }
}
