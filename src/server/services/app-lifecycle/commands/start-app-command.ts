import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { TranslatedError } from '@/server/utils/errors';
import { AppEventFormInput } from '@runtipi/shared';

export class StartAppCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, form: AppEventFormInput): Promise<void> {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'start', appid: appId, form });

    if (success) {
      await this.queries.updateApp(appId, { status: 'running' });
    } else {
      Logger.error(`Failed to start app ${appId}: ${stdout}`);
      await this.queries.updateApp(appId, { status: 'stopped' });
    }
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    await this.queries.updateApp(appId, { status: 'starting' });

    void this.sendEvent(appId, castAppConfig(app.config));
  }
}
