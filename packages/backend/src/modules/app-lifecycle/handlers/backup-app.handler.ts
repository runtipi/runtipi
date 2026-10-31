import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';
import { AppLifecycleCommandFactory } from '../app-lifecycle-command.factory';
import { AppJobService } from '../services/app-job.service';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler } from './base-handler';

@Injectable()
export class BackupAppHandler implements ILifecycleHandler {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly statusManager: StatusManagerService,
    private readonly jobs: AppJobService,
    private readonly config: ConfigurationService,
  ) {}

  async execute(appUrn: AppUrn): Promise<HandlerResult> {
    if (this.config.get('demoMode')) throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    if (app.status !== 'running' && app.status !== 'stopped') throw new ConflictException('Wait for the current app operation to finish.');

    const request: HandlerResult = this.jobs.submit(appUrn, 'backup', async (context) => {
      await this.statusManager.transitionTo(app.id, appUrn, 'backing_up');

      const result = await this.commandFactory.execute(
        {
          command: 'backup',
          appUrn,
          requestId: request.requestId,
          form: app.config,
          wasRunningBeforeBackup: app.status === 'running',
        },
        context,
      );

      const status = 'rollbackSucceeded' in result && result.rollbackSucceeded === false ? 'stopped' : app.status;

      if (result.success) {
        await this.statusManager.emitSuccess({ appId: app.id, appUrn, event: 'backup_success', status });
      } else if (context.signal.aborted && 'rollbackSucceeded' in result && result.rollbackSucceeded === true) {
        await this.statusManager.transitionTo(app.id, appUrn, status);
      } else {
        await this.statusManager.emitError({ appId: app.id, appUrn, event: 'backup_error', status, error: result.message });
      }

      return result;
    });

    return request;
  }
}
