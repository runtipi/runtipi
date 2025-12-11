import { TranslatableError } from '@/common/error/translatable-error';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import { AppsRepository } from '../../apps/apps.repository';
import { MarketplaceService } from '../../marketplace/marketplace.service';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { appFormSchema } from '../dto/app-lifecycle.dto';
import { AppValidationService } from '../services/app-validation.service';
import { StatusManagerService } from '../services/status-manager.service';
import { StartAppHandler } from './start-app.handler';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

export type InstallAppParams = {
  form: unknown;
  skipRun?: boolean;
};

@Injectable()
export class InstallAppHandler implements ILifecycleHandler<InstallAppParams> {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly validationService: AppValidationService,
    private readonly marketplaceService: MarketplaceService,
    private readonly startAppHandler: StartAppHandler,
  ) {}

  async execute(appUrn: AppUrn, params?: InstallAppParams): Promise<HandlerResult> {
    const { form, skipRun } = params ?? { form: {} };

    this.statusManager.emitEvent({ appUrn, event: 'status_change' });

    const app = await this.appRepository.getAppByUrn(appUrn);

    const parsedForm = appFormSchema(form);
    if (parsedForm instanceof type.errors) {
      throw new TranslatableError('SYSTEM_ERROR_INVALID_BODY', undefined, HttpStatus.BAD_REQUEST, { cause: parsedForm });
    }

    if (app) {
      await this.appRepository.updateAppById(app.id, { config: parsedForm, ...parsedForm });
      return this.startAppHandler.execute(appUrn);
    }

    const { isVisibleOnGuestDashboard } = parsedForm;

    const appInfo = await this.marketplaceService.getAppInfoFromAppStoreOrInstalled(appUrn);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.validationService.validateInstallSettings(appUrn, appInfo, parsedForm);

    const { appName, appStoreId } = extractAppUrn(appUrn);

    const createdApp = await this.appRepository.createApp({
      appName,
      status: 'installing',
      config: parsedForm,
      port: parsedForm.port ?? appInfo.port,
      version: appInfo.tipi_version,
      exposed: parsedForm.exposed ?? false,
      domain: parsedForm.domain ?? null,
      localSubdomain: parsedForm.localSubdomain ?? null,
      openPort: parsedForm.openPort ?? false,
      exposedLocal: parsedForm.exposedLocal ?? false,
      appStoreSlug: appStoreId,
      isVisibleOnGuestDashboard,
      enableAuth: parsedForm.enableAuth ?? false,
    });

    const requestId = generateRequestId();

    this.appEventsQueue.publish({ appUrn, command: 'install', requestId, form: { ...parsedForm, skipRun } }).then(async ({ success, message }) => {
      if (success) {
        await this.statusManager.emitSuccess({
          appId: createdApp.id,
          appUrn,
          event: 'install_success',
          status: skipRun ? 'stopped' : 'running',
        });
      } else {
        await this.statusManager.deleteApp(createdApp.id);
        this.statusManager.emitEvent({ appUrn, event: 'install_error', error: message });
      }
    });

    return { requestId };
  }
}
