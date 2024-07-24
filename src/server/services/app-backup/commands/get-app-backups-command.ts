import { AppBackupCommandParams, IAppBackupCommand } from './types';
import { AppDataService } from '@runtipi/shared/node';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppBackupsCommand>['execute']>>;

export class GetAppBackupsCommand implements IAppBackupCommand<ReturnValue> {
  private appDataService: AppDataService;

  constructor(params: AppBackupCommandParams) {
    this.appDataService = params.appDataService;
  }

  async execute(params: { appId: string; pageSize: number; page: number }) {
    return this.appDataService.getAppBackups(params);
  }
}
