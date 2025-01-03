import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SocketManager } from '@/core/socket/socket.service';
import type { AppUrn } from '@/types/app/app.types';
import { Injectable } from '@nestjs/common';
import { AppLifecycleService } from '../app-lifecycle/app-lifecycle.service';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { AppEventsQueue } from '../queue/entities/app-events';
import { BackupManager } from './backup.manager';

@Injectable()
export class BackupsService {
  constructor(
    private appsRepository: AppsRepository,
    private logger: LoggerService,
    private socketManager: SocketManager,
    private config: ConfigurationService,
    private appEventsQueue: AppEventsQueue,
    private appLifecycle: AppLifecycleService,
    private appFilesManager: AppFilesManager,
    private backupManager: BackupManager,
  ) {}

  public async backupApp(params: { appUrn: AppUrn }) {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { appUrn } = params;
    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    const appStatusBeforeUpdate = app.status;

    // Run script
    await this.appsRepository.updateAppById(app.id, { status: 'backing_up' });
    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appUrn, appStatus: 'starting' } });

    this.appEventsQueue.publish({ appUrn, command: 'backup', form: app.config }).then(async ({ success, message }) => {
      if (success) {
        if (appStatusBeforeUpdate === 'running') {
          await this.appLifecycle.startApp({ appUrn });
        } else {
          await this.appsRepository.updateAppById(app.id, { status: appStatusBeforeUpdate });
          this.socketManager.emit({ type: 'app', event: 'backup_success', data: { appUrn, appStatus: 'stopped' } });
        }
      } else {
        this.logger.error(`Failed to backup app ${appUrn}: ${message}`);
        await this.appsRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });
  }

  public async restoreApp(params: { appUrn: AppUrn; filename: string }) {
    const { appUrn, filename } = params;
    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    const appStatusBeforeUpdate = app.status;

    // Run script
    await this.appsRepository.updateAppById(app.id, { status: 'restoring' });
    await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appUrn, appStatus: 'restoring' } });

    this.appEventsQueue.publish({ appUrn, command: 'restore', filename, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        const restoredAppConfig = await this.appFilesManager.getInstalledAppInfo(appUrn);

        if (restoredAppConfig?.tipi_version) {
          await this.appsRepository.updateAppById(app.id, { version: restoredAppConfig?.tipi_version });
        }

        if (appStatusBeforeUpdate === 'running') {
          await this.appLifecycle.startApp({ appUrn });
        } else {
          await this.appsRepository.updateAppById(app.id, { status: appStatusBeforeUpdate });
          this.socketManager.emit({ type: 'app', event: 'restore_success', data: { appUrn, appStatus: 'stopped' } });
        }
      } else {
        this.logger.error(`Failed to restore app ${appUrn}: ${message}`);
        await this.appsRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });
  }

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
}
