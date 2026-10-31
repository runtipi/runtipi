import { AppOperationsService } from '../services/app-operations.service';
import { TranslatableError } from '@/common/error/translatable-error';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppFilesManager } from '../../apps/app-files-manager';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';
import { StartAppHandler } from './start-app.handler';

export type RestoreAppParams = {
  filename: string;
};

@Injectable()
export class RestoreAppHandler implements ILifecycleHandler<RestoreAppParams> {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly appFilesManager: AppFilesManager,
    private readonly startAppHandler: StartAppHandler,
    private readonly operations: AppOperationsService,
  ) {}

  async execute(appUrn: AppUrn, params?: RestoreAppParams): Promise<HandlerResult> {
    const { filename } = params ?? {};
    if (!filename) {
      throw new TranslatableError('SYSTEM_ERROR_INVALID_BODY', undefined, HttpStatus.BAD_REQUEST);
    }

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const appStatusBeforeRestore = app.status;
    await this.statusManager.transitionTo(app.id, appUrn, 'restoring');

    const requestId = generateRequestId();

    return this.operations.submit(appUrn, 'restore', requestId, async (progress) => {
      const result = await this.appEventsQueue.publish({ appUrn, command: 'restore', requestId, filename, form: app.config });
      const { success, message } = result;
      const appStopped = 'appStopped' in result && result.appStopped === true;

      if (success) {
        const restoredAppConfig = await this.appFilesManager.getInstalledAppInfo(appUrn);

        if (typeof restoredAppConfig?.tipi_version === 'number') {
          await this.appRepository.updateAppById(app.id, { version: restoredAppConfig.tipi_version });
        }

        if (appStatusBeforeRestore === 'running') {
          progress('starting');
          const followup = await this.startAppHandler.execute(appUrn);
          return this.operations.waitFor(followup.requestId);
        } else {
          await this.statusManager.emitSuccess({
            appId: app.id,
            appUrn,
            event: 'restore_success',
            status: appStatusBeforeRestore,
          });
        }
      } else {
        const errorStatus = appStopped ? 'stopped' : appStatusBeforeRestore;
        await this.statusManager.emitError({
          appId: app.id,
          appUrn,
          event: 'restore_error',
          status: errorStatus,
          error: message ?? 'Unknown error',
        });
      }

      return result;
    });
  }
}
