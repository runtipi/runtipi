import type { IAppDataService } from '@runtipi/shared/node';
import type { AppBackupCommandParams, IAppBackupCommand } from './types';

export class DeleteAppBackupCommand implements IAppBackupCommand {
  private appDataService: IAppDataService;

  constructor(params: AppBackupCommandParams) {
    this.appDataService = params.appDataService;
  }

  async execute(params: { appId: string; filename: string }): Promise<void> {
    const { appId, filename } = params;

    await this.appDataService.deleteAppBackup(appId, filename);
  }
}
