import type { IBackupManager } from '@runtipi/shared/node';
import type { AppBackupCommandParams, IAppBackupCommand } from './types';

export class DeleteAppBackupCommand implements IAppBackupCommand {
  private backupManager: IBackupManager;

  constructor(params: AppBackupCommandParams) {
    this.backupManager = params.backupManager;
  }

  async execute(params: { appId: string; filename: string }): Promise<void> {
    const { appId, filename } = params;

    await this.backupManager.deleteBackup(appId, filename);
  }
}
