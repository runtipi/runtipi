import { TranslatedError } from '@/server/utils/errors';
import type { App } from '@runtipi/db';
import type { AppCatalogCommandParams, IAppCatalogCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppCommand>['execute']>>;

export class GetAppCommand implements IAppCatalogCommand<ReturnValue> {
  constructor(private params: AppCatalogCommandParams) {}

  async execute(appId: string) {
    let app = await this.params.queries.getApp(appId);
    const info = await this.params.appDataService.getAppInfoFromInstalledOrAppStore(appId);
    const updateInfo = await this.params.appDataService.getUpdateInfo(appId);

    if (info) {
      if (!app) {
        app = { id: appId, status: 'missing', config: {}, exposed: false, domain: '' } as App;
      }

      return { ...app, ...updateInfo, info };
    }

    throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id: appId });
  }
}
