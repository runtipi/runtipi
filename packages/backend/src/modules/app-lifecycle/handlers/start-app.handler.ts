import { TranslatableError } from '@/common/error/translatable-error';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

export type StartAppParams = {
  skipPull?: boolean;
};

@Injectable()
export class StartAppHandler implements ILifecycleHandler<StartAppParams> {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
  ) {}

  async execute(appUrn: AppUrn, params?: StartAppParams): Promise<HandlerResult> {
    const { skipPull } = params ?? {};
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.statusManager.transitionTo(app.id, appUrn, 'starting');

    const requestId = generateRequestId();

    this.appEventsQueue.publish({ appUrn, command: 'start', requestId, form: { ...app.config, skipPull } }).then(async ({ success, message }) => {
      if (success) {
        await this.statusManager.emitSuccess({
          appId: app.id,
          appUrn,
          event: 'start_success',
          status: 'running',
          clearPendingRestart: true,
        });
      } else {
        await this.statusManager.emitError({
          appId: app.id,
          appUrn,
          event: 'start_error',
          status: 'stopped',
          error: message ?? 'Unknown error',
        });
      }
    });

    return { requestId };
  }
}
