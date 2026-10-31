import { AppOperationsService } from '../services/app-operations.service';
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
    private readonly operations: AppOperationsService,
  ) {}

  async execute(appUrn: AppUrn): Promise<HandlerResult> {
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const appStatusBeforeReset = app.status;
    await this.statusManager.transitionTo(app.id, appUrn, 'resetting');

    const requestId = generateRequestId();

    return this.operations.submit(appUrn, 'reset', requestId, async (progress) => {
      const result = await this.appEventsQueue.publish({ command: 'reset', appUrn, requestId, form: app.config });
      const { success, message } = result;
      if (success) {
        await this.statusManager.emitSuccess({
          appId: app.id,
          appUrn,
          event: 'reset_success',
          status: 'stopped',
        });

        if (appStatusBeforeReset === 'running') {
          progress('starting');
          const followup = await this.startAppHandler.execute(appUrn);
          return this.operations.waitFor(followup.requestId);
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

      return result;
    });
  }
}
