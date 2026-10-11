import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import semver from 'semver';
import { AppsRepository } from '../../apps/apps.repository';
import { MarketplaceService } from '../../marketplace/marketplace.service';
import { AppLifecycleCommandFactory } from '../app-lifecycle-command.factory';
import { AppJobService } from '../services/app-job.service';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler } from './base-handler';

export type UpdateAppParams = { performBackup: boolean };

@Injectable()
export class UpdateAppHandler implements ILifecycleHandler<UpdateAppParams> {
  constructor(
    private readonly logger: LoggerService,
    private readonly appRepository: AppsRepository,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly statusManager: StatusManagerService,
    private readonly config: ConfigurationService,
    private readonly marketplaceService: MarketplaceService,
    private readonly jobs: AppJobService,
  ) {}

  async execute(appUrn: AppUrn, params?: UpdateAppParams): Promise<HandlerResult> {
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    if (app.status !== 'running' && app.status !== 'stopped') throw new ConflictException('Wait for the current app operation to finish.');

    const version = this.config.get('version');
    const { minTipiVersion } = await this.marketplaceService.getAppUpdateInfo(appUrn);

    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: minTipiVersion });
    }

    const request: HandlerResult = this.jobs.submit(appUrn, 'update', async (context) => {
      let terminalStatus = app.status;

      try {
        await this.statusManager.transitionTo(app.id, appUrn, 'updating');

        const result = await this.commandFactory.execute(
          {
            command: 'update',
            appUrn,
            requestId: request.requestId,
            form: app.config,
            performBackup: params?.performBackup ?? false,
            wasRunningBeforeUpdate: app.status === 'running',
          },
          context,
        );

        if (result.success) {
          await this.statusManager.emitSuccess({ appId: app.id, appUrn, event: 'update_success', status: app.status });
        } else {
          terminalStatus = 'rollbackSucceeded' in result && result.rollbackSucceeded === true ? app.status : 'stopped';

          if (context.signal.aborted && 'rollbackSucceeded' in result && result.rollbackSucceeded === true) {
            await this.statusManager.transitionTo(app.id, appUrn, terminalStatus);
          } else {
            await this.statusManager.emitError({ appId: app.id, appUrn, event: 'update_error', status: terminalStatus, error: result.message });
          }
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process update result for app ${appUrn}: ${message}`);

        await this.statusManager.emitError({ appId: app.id, appUrn, event: 'update_error', status: terminalStatus, error: message });
        return { success: false, message };
      }
    });

    return request;
  }
}
