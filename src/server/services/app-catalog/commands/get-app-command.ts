import { AppQueries } from '@/server/queries/apps/apps.queries';
import { type App } from '@/server/db/schema';
import { TranslatedError } from '@/server/utils/errors';
import { AppCatalogCommandParams, IAppCatalogCommand } from './types';
import { AppDataService } from '@runtipi/shared/node';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppCommand>['execute']>>;

export class GetAppCommand implements IAppCatalogCommand<ReturnValue> {
  private queries: AppQueries;
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
