import { castAppConfig } from '@/lib/helpers/castAppConfig';
import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { AppEventFormInput } from '@runtipi/shared';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { getClass } from 'src/inversify.config';

export class UninstallAppCommand implements IAppLifecycleCommand {
  private queries: IAppQueries;
  private eventDispatcher: IEventDispatcher;
  private executeOtherCommand: IAppLifecycleCommand['execute'];

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
    this.executeOtherCommand = params.executeOtherCommand;
  }

  private async sendEvent(appId: string, form: AppEventFormInput) {
    const logger = getClass('ILogger');
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'uninstall', appid: appId, form });

    if (success) {
      await this.queries.deleteApp(appId);
    } else {
      await this.queries.updateApp(appId, { status: 'stopped' });
      logger.error(`Failed to uninstall app ${appId}: ${stdout}`);
    }
  }

  private stopApp(appId: string) {
    return this.executeOtherCommand('stopApp', { appId });
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;

    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    if (app.status === 'running') {
      await this.stopApp(appId);
    }

    await this.queries.updateApp(appId, { status: 'uninstalling' });

    void this.sendEvent(appId, castAppConfig(app.config));
  }
}
