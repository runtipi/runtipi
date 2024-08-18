import type { IAppDataService } from '@runtipi/shared/node';
import type { AppBackupCommandParams, IAppBackupCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppBackupsCommand>['execute']>>;

export class GetAppBackupsCommand implements IAppBackupCommand<ReturnValue> {
  private appDataService: IAppDataService;

  constructor(params: AppBackupCommandParams) {
    this.appDataService = params.appDataService;
  }

  async execute(params: { appId: string; pageSize: number; page: number }) {
    return this.appDataService.getAppBackups(params);
  }
}
