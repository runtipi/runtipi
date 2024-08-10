import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { App } from '@runtipi/db';
import type { AppDataService } from '@runtipi/shared/node';
import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppCommand>['execute']>>;

export class GetAppCommand implements IAppCatalogCommand<ReturnValue> {
  private queries: IAppQueries;
  private appDataService: AppDataService;

  constructor(params: AppCatalogCommandParams) {
    this.queries = params.queries;
    this.appDataService = params.appDataService;
  }

  async execute(appId: string) {
    let app = await this.queries.getApp(appId);
    const info = await this.appDataService.getAppInfoFromInstalledOrAppStore(appId);
    const updateInfo = await this.appDataService.getUpdateInfo(appId);

    if (info) {
      if (!app) {
        app = { id: appId, status: 'missing', config: {}, exposed: false, domain: '' } as App;
      }

      return { ...app, ...updateInfo, info };
    }

    throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id: appId });
  }
}
