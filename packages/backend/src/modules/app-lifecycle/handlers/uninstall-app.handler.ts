import { TranslatableError } from '@/common/error/translatable-error';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';
import { BackupManager } from '../../backups/backup.manager';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

export type UninstallAppParams = {
  removeBackups: boolean;
};

@Injectable()
export class UninstallAppHandler implements ILifecycleHandler<UninstallAppParams> {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly backupManager: BackupManager,
  ) {}

  async execute(appUrn: AppUrn, params?: UninstallAppParams): Promise<HandlerResult> {
    const { removeBackups } = params ?? { removeBackups: false };
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    if (removeBackups) {
      await this.backupManager.deleteAppBackupsByUrn(appUrn);
    }

    await this.statusManager.transitionTo(app.id, appUrn, 'uninstalling');

    const requestId = generateRequestId();

    this.appEventsQueue.publish({ command: 'uninstall', appUrn, requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        await this.statusManager.deleteApp(app.id);
        this.statusManager.emitEvent({ appUrn, event: 'uninstall_success' });
      } else {
        await this.statusManager.emitError({
          appId: app.id,
          appUrn,
          event: 'uninstall_error',
          status: 'stopped',
          error: message ?? 'Unknown error',
        });
      }
    });

    return { requestId };
  }
}
