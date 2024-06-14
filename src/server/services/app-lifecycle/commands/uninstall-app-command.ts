import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TranslatedError } from '@/server/utils/errors';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { StopAppCommand } from './stop-app-command';
import { AppEventFormInput } from '@runtipi/shared';

export class UninstallAppCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, form: AppEventFormInput) {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'uninstall', appid: appId, form });

    if (success) {
      await this.queries.deleteApp(appId);
    } else {
      await this.queries.updateApp(appId, { status: 'stopped' });
      Logger.error(`Failed to uninstall app ${appId}: ${stdout}`);
    }
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;

    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    if (app.status === 'running') {
      const stopCommand = new StopAppCommand({ queries: this.queries, eventDispatcher: this.eventDispatcher });
      await stopCommand.execute({ appId });
    }

    await this.queries.updateApp(appId, { status: 'uninstalling' });

    void this.sendEvent(appId, castAppConfig(app.config));
  }
}
