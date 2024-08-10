import { castAppConfig } from '@/lib/helpers/castAppConfig';
import type { EventDispatcher } from '@/server/core/EventDispatcher';
import { Logger } from '@/server/core/Logger';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { AppEventFormInput } from '@runtipi/shared';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';

export class RestartAppCommand implements IAppLifecycleCommand {
  private queries: IAppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, form: AppEventFormInput): Promise<void> {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'restart', appid: appId, form });

    if (success) {
      await this.queries.updateApp(appId, { status: 'running' });
    } else {
      Logger.error(`Failed to restart app ${appId}: ${stdout}`);
      await this.queries.updateApp(appId, { status: 'stopped' });
    }
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    // Run script
    await this.queries.updateApp(appId, { status: 'restarting' });

    void this.sendEvent(appId, castAppConfig(app.config));
  }
}
