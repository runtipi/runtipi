import { AppQueries } from '@/server/queries/apps/apps.queries';
import { type App } from '@/server/db/schema';
import { TranslatedError } from '@/server/utils/errors';
import { getAppInfo, getUpdateInfo } from '../apps.helpers';
import { AppCatalogCommandParams, ICommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppCommand>['execute']>>;

export class GetAppCommand implements ICommand<ReturnValue> {
  private queries: AppQueries;
  private appId?: string;

  constructor(params: AppCatalogCommandParams) {
    this.queries = params.queries;
    this.appId = params.appId;
  }

  async execute() {
    if (!this.appId) {
      throw new Error('Call to getAppCommand.execute() without appId');
    }

    let app = await this.queries.getApp(this.appId);
    const info = getAppInfo(this.appId, app?.status);
    const updateInfo = getUpdateInfo(this.appId);

    if (info) {
      if (!app) {
        app = { id: this.appId, status: 'missing', config: {}, exposed: false, domain: '' } as App;
      }

      return { ...app, ...updateInfo, info };
    }

    throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id: this.appId });
  }
}
