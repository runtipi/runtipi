import { AppBackupCommandParams, IAppBackupCommand } from './types';
import { AppDataService } from '@runtipi/shared/node';

export class DeleteAppBackupCommand implements IAppBackupCommand {
  private appDataService: AppDataService;

  constructor(params: AppBackupCommandParams) {
    this.appDataService = params.appDataService;
  }

  async execute(params: { appId: string; filename: string }): Promise<void> {
    const { appId, filename } = params;

    await this.appDataService.deleteAppBackup(appId, filename);
  }
}
