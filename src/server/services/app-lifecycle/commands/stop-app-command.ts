import { castAppConfig } from '@/lib/helpers/castAppConfig';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { AppEventFormInput } from '@runtipi/shared';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { getClass } from 'src/inversify.config';

export class StopAppCommand implements IAppLifecycleCommand {
  private queries: IAppQueries;
  private eventDispatcher: IEventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, form: AppEventFormInput): Promise<void> {
    const logger = getClass('ILogger');
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'stop', appid: appId, form });

    if (success) {
      await this.queries.updateApp(appId, { status: 'stopped' });
    } else {
      logger.error(`Failed to stop app ${appId}: ${stdout}`);
      await this.queries.updateApp(appId, { status: 'running' });
    }
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    await this.queries.updateApp(appId, { status: 'stopping' });

    void this.sendEvent(appId, castAppConfig(app.config));
  }
}
