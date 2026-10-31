import { AppOperationsService } from '../services/app-operations.service';
import { TranslatableError } from '@/common/error/translatable-error';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

@Injectable()
export class StopAppHandler implements ILifecycleHandler {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly operations: AppOperationsService,
  ) {}

  async execute(appUrn: AppUrn): Promise<HandlerResult> {
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.statusManager.transitionTo(app.id, appUrn, 'stopping');

    const requestId = generateRequestId();

    return this.operations.submit(appUrn, 'stop', requestId, async () => {
      const result = await this.appEventsQueue.publish({ command: 'stop', appUrn, requestId, form: app.config });
      const { success, message } = result;
      if (success) {
        await this.statusManager.emitSuccess({
          appId: app.id,
          appUrn,
          event: 'stop_success',
          status: 'stopped',
        });
      } else {
        await this.statusManager.emitError({
          appId: app.id,
          appUrn,
          event: 'stop_error',
          status: 'running',
          error: message ?? 'Unknown error',
        });
      }

      return result;
    });
  }
}
