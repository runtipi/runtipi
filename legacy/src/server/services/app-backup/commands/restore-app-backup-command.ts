import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { AppStatus } from '@runtipi/db';
import type { AppBackupCommandParams, IAppBackupCommand } from './types';
import { getClass } from 'src/inversify.config';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';

export class RestoreAppBackupCommand implements IAppBackupCommand {
  private queries: IAppQueries;
  private eventDispatcher: IEventDispatcher;

  constructor(params: AppBackupCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, filename: string, appStatusBeforeUpdate: AppStatus): Promise<void> {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'restore', appid: appId, filename });

    const appLifecycle = getClass('IAppLifecycleService');
    const logger = getClass('ILogger');

    await this.queries.updateApp(appId, { status: 'stopped' });
    if (success) {
      if (appStatusBeforeUpdate === 'running') {
        await appLifecycle.executeCommand('startApp', { appId });
      } else {
        await this.queries.updateApp(appId, { status: appStatusBeforeUpdate });
      }
    } else {
      logger.error(`Failed to restore app ${appId}: ${stdout}`);
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
