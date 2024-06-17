import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { TranslatedError } from '@/server/utils/errors';
import { AppEventFormInput } from '@runtipi/shared';

export class RestoreAppCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, archiveName: string, form: AppEventFormInput): Promise<void> {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'restore', appid: appId, archiveName, form });

    if (success) {
      await this.queries.updateApp(appId, { status: 'running' });
    } else {
      Logger.error(`Failed to restore app ${appId}: ${stdout}`);
      await this.queries.updateApp(appId, { status: 'stopped' });
    }
  }

  async execute(params: { appId: string; archiveName: string }): Promise<void> {
    const { appId, archiveName } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    // Run script
    await this.queries.updateApp(appId, { status: 'restoring' });

    void this.sendEvent(appId, archiveName, castAppConfig(app.config));
  }
}
