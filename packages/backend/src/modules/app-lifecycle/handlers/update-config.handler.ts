import { TranslatableError } from '@/common/error/translatable-error';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppFilesManager } from '../../apps/app-files-manager';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { getAppConfigUpdate } from '../services/app-config';
import { AppValidationService } from '../services/app-validation.service';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

export type UpdateConfigParams = {
  form: unknown;
};

@Injectable()
export class UpdateConfigHandler implements ILifecycleHandler<UpdateConfigParams> {
  constructor(
    private readonly logger: LoggerService,
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly appFilesManager: AppFilesManager,
    private readonly validationService: AppValidationService,
  ) {}

  async execute(appUrn: AppUrn, params?: UpdateConfigParams): Promise<HandlerResult> {
    const app = await this.appRepository.getAppByUrn(appUrn);
    if (!app) throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);

    const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);
    if (!appInfo) throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);

    const form = await this.validationService.validateUpdateConfigSettings(appUrn, appInfo, params?.form ?? {}, app.id);

    const requestId = generateRequestId();

    const { success, message } = await this.appEventsQueue.publish({
      command: 'generate_env',
      appUrn,
      requestId,
      form,
    });

    if (!success) {
      this.logger.error(`Failed to update app ${appUrn}: ${message}`);
      throw new TranslatableError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR, { cause: message });
    }

    await this.appRepository.updateAppById(app.id, {
      ...getAppConfigUpdate(appInfo, form),
      pendingRestart: app.pendingRestart || JSON.stringify(app.config) !== JSON.stringify(form),
    });

    return { requestId };
  }
}
