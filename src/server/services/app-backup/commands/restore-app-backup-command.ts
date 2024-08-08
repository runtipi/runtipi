import type { AppBackupCommandParams, IAppBackupCommand } from './types';
import type { EventDispatcher } from '@/server/core/EventDispatcher';
import { Logger } from '@/server/core/Logger';
import { TranslatedError } from '@/server/utils/errors';
import type { AppStatus } from '@runtipi/db';
import { appLifecycle } from '../../app-lifecycle/app-lifecycle.service';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';

export class RestoreAppBackupCommand implements IAppBackupCommand {
  private queries: IAppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppBackupCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, filename: string, appStatusBeforeUpdate: AppStatus): Promise<void> {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'restore', appid: appId, filename });

    await this.queries.updateApp(appId, { status: 'stopped' });
    if (success) {
      if (appStatusBeforeUpdate === 'running') {
        await appLifecycle.executeCommand('startApp', { appId });
      } else {
        await this.queries.updateApp(appId, { status: appStatusBeforeUpdate });
      }
    } else {
      Logger.error(`Failed to restore app ${appId}: ${stdout}`);
    }
  }

  async execute(params: { appId: string; filename: string }): Promise<void> {
    const { appId, filename } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    // Run script
    await this.queries.updateApp(appId, { status: 'restoring' });

    void this.sendEvent(appId, filename, app.status);
  }
}
