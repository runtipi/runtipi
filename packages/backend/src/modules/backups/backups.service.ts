import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../apps/apps.repository';
import { BackupManager } from './backup.manager';

@Injectable()
export class BackupsService {
  constructor(
    private appsRepository: AppsRepository,
    private config: ConfigurationService,
    private backupManager: BackupManager,
  ) {}

  public async getAppBackups(params: { appUrn: AppUrn; page: number; pageSize: number }) {
    const { appUrn, page, pageSize } = params;
    const backups = await this.backupManager.listBackupsByAppId(appUrn);

    backups.sort((a, b) => b.date - a.date);

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

  public async deleteAppBackup(params: { appUrn: AppUrn; filename: string }): Promise<void> {
    const { appUrn, filename } = params;

    await this.backupManager.deleteBackup(appUrn, filename);
  }

  public async getBackupFilePath(params: { appUrn: AppUrn; filename: string }): Promise<string> {
    const { appUrn, filename } = params;
    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    return this.backupManager.getBackupPath(appUrn, filename);
  }

  public async uploadBackup(params: { appUrn: AppUrn; filename: string; fileBuffer: Buffer }): Promise<void> {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { appUrn, filename, fileBuffer } = params;
    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    await this.backupManager.uploadBackup(appUrn, filename, fileBuffer);
  }
}
