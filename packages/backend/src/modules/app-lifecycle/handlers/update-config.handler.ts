import { TranslatableError } from '@/common/error/translatable-error';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import { AppFilesManager } from '../../apps/app-files-manager';
import { AppsRepository } from '../../apps/apps.repository';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { appFormSchema } from '../dto/app-lifecycle.dto';
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
    const { form } = params ?? { form: {} };

    const parsedForm = appFormSchema(form);

    if (parsedForm instanceof type.errors) {
      throw new TranslatableError('SYSTEM_ERROR_INVALID_BODY', undefined, HttpStatus.BAD_REQUEST, { cause: parsedForm });
    }

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.validationService.validateUpdateConfigSettings(appUrn, appInfo, parsedForm, app.id);

    const requestId = generateRequestId();

    const { success, message } = await this.appEventsQueue.publish({
      command: 'generate_env',
      appUrn,
      requestId,
      form: parsedForm,
    });

    if (!success) {
      this.logger.error(`Failed to update app ${appUrn}: ${message}`);
      throw new TranslatableError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR, { cause: message });
    }

    const changed = await this.appRepository.updateAppById(app.id, {
      exposed: parsedForm.exposed ?? false,
      exposedLocal: parsedForm.exposedLocal ?? false,
      openPort: parsedForm.openPort,
      port: parsedForm.port ?? appInfo.port,
      domain: parsedForm.domain ?? null,
      localSubdomain: parsedForm.localSubdomain ?? null,
      config: parsedForm,
      isVisibleOnGuestDashboard: parsedForm.isVisibleOnGuestDashboard ?? false,
      enableAuth: parsedForm.enableAuth ?? false,
      maxBackups: parsedForm.maxBackups ?? null,
    });

    if (!changed?.pendingRestart) {
      const pendingRestart = this.hasConfigChanged(app.config, changed?.config || {});
      await this.appRepository.updateAppById(app.id, { pendingRestart });
    }

    return { requestId };
  }

  private hasConfigChanged(oldConfig: Record<string, unknown>, newConfig: Record<string, unknown>): boolean {
    const oldJSON = JSON.stringify(oldConfig);
    const newJSON = JSON.stringify(newConfig);

    return oldJSON !== newJSON;
  }
}
