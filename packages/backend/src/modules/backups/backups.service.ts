import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SocketManager } from '@/core/socket/socket.service';
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

  public async backupApp(params: { appId: string }) {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { appId } = params;
    const app = await this.appsRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const appStatusBeforeUpdate = app.status;

    // Run script
    await this.appsRepository.updateApp(appId, { status: 'backing_up' });
    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'starting' } });

    this.appEventsQueue.publish({ appid: appId, command: 'backup', form: app.config }).then(async ({ success, message }) => {
      if (success) {
        if (appStatusBeforeUpdate === 'running') {
          await this.appLifecycle.startApp({ appId });
        } else {
          await this.appsRepository.updateApp(appId, { status: appStatusBeforeUpdate });
          this.socketManager.emit({ type: 'app', event: 'backup_success', data: { appId, appStatus: 'stopped' } });
        }
      } else {
        this.logger.error(`Failed to backup app ${appId}: ${message}`);
        await this.appsRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  public async restoreApp(params: { appId: string; filename: string }) {
    const { appId, filename } = params;
    const app = await this.appsRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const appStatusBeforeUpdate = app.status;

    // Run script
    await this.appsRepository.updateApp(appId, { status: 'restoring' });
    await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'restoring' } });

    this.appEventsQueue.publish({ appid: appId, command: 'restore', filename, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        const restoredAppConfig = await this.appFilesManager.getInstalledAppInfo(appId);
        await this.appsRepository.updateApp(appId, { version: restoredAppConfig?.tipi_version });

        if (appStatusBeforeUpdate === 'running') {
          await this.appLifecycle.startApp({ appId });
        } else {
          await this.appsRepository.updateApp(appId, { status: appStatusBeforeUpdate });
          this.socketManager.emit({ type: 'app', event: 'restore_success', data: { appId, appStatus: 'stopped' } });
        }
      } else {
        this.logger.error(`Failed to restore app ${appId}: ${message}`);
        await this.appsRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  public async getAppBackups(params: { appId: string; page: number; pageSize: number }) {
    const { appId, page, pageSize } = params;
    const backups = await this.backupManager.listBackupsByAppId(appId);

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

  public async deleteAppBackup(params: { appId: string; filename: string }): Promise<void> {
    const { appId, filename } = params;

    await this.backupManager.deleteBackup(appId, filename);
  }
}
