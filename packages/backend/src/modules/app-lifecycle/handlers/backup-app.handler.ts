import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';
import { StartAppHandler } from './start-app.handler';

@Injectable()
export class BackupAppHandler implements ILifecycleHandler {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly startAppHandler: StartAppHandler,
    private readonly config: ConfigurationService,
  ) {}

  async execute(appUrn: AppUrn): Promise<HandlerResult> {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const appStatusBeforeBackup = app.status;
    await this.statusManager.transitionTo(app.id, appUrn, 'backing_up');

    const requestId = generateRequestId();

    this.appEventsQueue.publish({ appUrn, command: 'backup', requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        if (appStatusBeforeBackup === 'running') {
          await this.startAppHandler.execute(appUrn);
        } else {
          await this.statusManager.emitSuccess({
            appId: app.id,
            appUrn,
            event: 'backup_success',
            status: appStatusBeforeBackup,
          });
        }
      } else {
        await this.statusManager.emitError({
          appId: app.id,
          appUrn,
          event: 'backup_error',
          status: 'stopped',
          error: message ?? 'Unknown error',
        });
      }
    });

    return { requestId };
  }
}
