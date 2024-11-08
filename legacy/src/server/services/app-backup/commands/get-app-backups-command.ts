import type { IBackupManager } from '@runtipi/shared/node';
import type { AppBackupCommandParams, IAppBackupCommand } from './types';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppBackupsCommand>['execute']>>;

export class GetAppBackupsCommand implements IAppBackupCommand<ReturnValue> {
  private backupManager: IBackupManager;

  constructor(params: AppBackupCommandParams) {
    this.backupManager = params.backupManager;
  }

  async execute(params: { appId: string; pageSize: number; page: number }) {
    const { appId, page, pageSize } = params;
    const backups = await this.backupManager.listBackupsByAppId(appId);

    backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = backups.slice(start, end);

    return {
      data,
      total: backups.length,
      currentPage: Math.floor(start / pageSize) + 1,
      lastPage: Math.ceil(backups.length / pageSize),
    };
  }
}
