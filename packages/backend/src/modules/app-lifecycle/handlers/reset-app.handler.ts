import { TranslatableError } from '@/common/error/translatable-error';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { StartAppHandler } from './start-app.handler';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

@Injectable()
export class ResetAppHandler implements ILifecycleHandler {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly startAppHandler: StartAppHandler,
  ) {}

  async execute(appUrn: AppUrn): Promise<HandlerResult> {
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const appStatusBeforeReset = app.status;
    await this.statusManager.transitionTo(app.id, appUrn, 'resetting');

    const requestId = generateRequestId();

    this.appEventsQueue.publish({ command: 'reset', appUrn, requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        await this.statusManager.emitSuccess({
          appId: app.id,
          appUrn,
          event: 'reset_success',
          status: 'stopped',
        });

        if (appStatusBeforeReset === 'running') {
          await this.startAppHandler.execute(appUrn);
        } else {
          await this.appRepository.updateAppById(app.id, { status: appStatusBeforeReset });
        }
      } else {
        await this.statusManager.emitError({
          appId: app.id,
          appUrn,
          event: 'reset_error',
          status: 'running',
          error: message ?? 'Unknown error',
        });
      }
    });

    return { requestId };
  }
}
