import { TipiConfig } from '@/server/core/TipiConfig';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { AppStatus } from '@runtipi/db';
import type { AppBackupCommandParams, IAppBackupCommand } from './types';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { getClass } from 'src/inversify.config';

export class CreateAppBackupCommand implements IAppBackupCommand {
  private queries: IAppQueries;
  private eventDispatcher: IEventDispatcher;

  constructor(params: AppBackupCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, appStatusBeforeUpdate?: AppStatus): Promise<void> {
    const appLifecycle = getClass('IAppLifecycleService');
    const logger = getClass('ILogger');

    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync(
      { type: 'app', command: 'backup', appid: appId, form: {} },
      1000 * 60 * 15, // 15 minutes
    );

    if (success) {
      if (appStatusBeforeUpdate === 'running') {
        await appLifecycle.executeCommand('startApp', { appId });
      } else {
        await this.queries.updateApp(appId, { status: appStatusBeforeUpdate });
      }

      await this.queries.updateApp(appId, { status: 'running' });
    } else {
      logger.error(`Failed to backup app ${appId}: ${stdout}`);
      await this.queries.updateApp(appId, { status: 'stopped' });
    }
  }

  async execute(params: { appId: string }): Promise<void> {
    if (TipiConfig.getConfig().demoMode) {
      throw new TranslatedError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { appId } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    // Run script
    await this.queries.updateApp(appId, { status: 'backing_up' });

    void this.sendEvent(appId, app.status);
  }
}
