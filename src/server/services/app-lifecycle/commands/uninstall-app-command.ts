import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TranslatedError } from '@/server/utils/errors';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { StopAppCommand } from './stop-app-command';

export class UninstallAppCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
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

    void this.eventDispatcher
      .dispatchEventAsync({ type: 'app', command: 'uninstall', appid: appId, form: castAppConfig(app.config) })
      .then(({ stdout, success }) => {
        if (success) {
          this.queries.deleteApp(appId).catch(Logger.error);
        } else {
          this.queries.updateApp(appId, { status: 'stopped' }).catch(Logger.error);
          Logger.error(`Failed to uninstall app ${appId}: ${stdout}`);
        }
      });
  }
}
