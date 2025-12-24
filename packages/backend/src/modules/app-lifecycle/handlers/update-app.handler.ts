import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import semver from 'semver';
import { AppFilesManager } from '../../apps/app-files-manager';
import { AppsRepository } from '../../apps/apps.repository';
import { MarketplaceService } from '../../marketplace/marketplace.service';
import { AppEventsQueue } from '../../queue/entities/app-events';
import { StatusManagerService } from '../services/status-manager.service';
import { StartAppHandler } from './start-app.handler';
import { UpdateConfigHandler } from './update-config.handler';
import { type HandlerResult, type ILifecycleHandler, generateRequestId } from './base-handler';

export type UpdateAppParams = {
  performBackup: boolean;
};

@Injectable()
export class UpdateAppHandler implements ILifecycleHandler<UpdateAppParams> {
  constructor(
    private readonly logger: LoggerService,
    private readonly appRepository: AppsRepository,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly statusManager: StatusManagerService,
    private readonly config: ConfigurationService,
    private readonly marketplaceService: MarketplaceService,
    private readonly appFilesManager: AppFilesManager,
    private readonly startAppHandler: StartAppHandler,
    private readonly updateConfigHandler: UpdateConfigHandler,
  ) {}

  async execute(appUrn: AppUrn, params?: UpdateAppParams): Promise<HandlerResult> {
    const { performBackup } = params ?? { performBackup: false };
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const version = this.config.get('version');

    const { minTipiVersion } = await this.marketplaceService.getAppUpdateInfo(appUrn);
    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: minTipiVersion });
    }

    await this.statusManager.transitionTo(app.id, appUrn, 'updating');
    const appStatusBeforeUpdate = app.status;

    const requestId = generateRequestId();

    this.appEventsQueue.publish({ command: 'update', appUrn, requestId, form: app.config, performBackup }).then(async ({ success, message }) => {
      if (success) {
        const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

        await this.updateConfigHandler.execute(appUrn, { form: app.config });
        await this.appRepository.updateAppById(app.id, { version: appInfo?.tipi_version });
        this.statusManager.emitEvent({ appUrn, event: 'update_success' });

        if (appStatusBeforeUpdate === 'running') {
          await this.startAppHandler.execute(appUrn);
        } else {
          await this.appRepository.updateAppById(app.id, { status: appStatusBeforeUpdate });
        }
      } else {
        this.logger.error(`Failed to update app ${appUrn}: ${message}`);
        this.statusManager.emitEvent({ appUrn, event: 'update_error', error: message });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });

    return { requestId };
  }
}
