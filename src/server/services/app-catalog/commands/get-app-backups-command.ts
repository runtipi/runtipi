import { AppCatalogCommandParams, IAppCatalogCommand } from './types';
import { AppDataService } from '@runtipi/shared/node';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppBackupsCommand>['execute']>>;

export class GetAppBackupsCommand implements IAppCatalogCommand<ReturnValue> {
  private appDataService: AppDataService;

  constructor(params: AppCatalogCommandParams) {
    this.appDataService = params.appDataService;
  }

  async execute(params: { appId: string; pageSize: number; page: number }) {
    return this.appDataService.getAppBackups(params);
  }
}
