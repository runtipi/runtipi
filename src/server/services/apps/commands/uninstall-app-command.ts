import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TranslatedError } from '@/server/utils/errors';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { StopAppCommand } from './stop-app-command';

export class UninstallAppCommand implements ICommand {
  constructor(
    private appId: string,
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {}

  async execute(): Promise<void> {
    const app = await this.queries.getApp(this.appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: this.appId });
    }

    if (app.status === 'running') {
      const stopCommand = new StopAppCommand(this.appId, this.queries, this.eventDispatcher);
      await stopCommand.execute();
    }

    await this.queries.updateApp(this.appId, { status: 'uninstalling' });

    void this.eventDispatcher
      .dispatchEventAsync({ type: 'app', command: 'uninstall', appid: this.appId, form: castAppConfig(app.config) })
      .then(({ stdout, success }) => {
        if (success) {
          this.queries.deleteApp(this.appId).catch(Logger.error);
        } else {
          this.queries.updateApp(this.appId, { status: 'stopped' }).catch(Logger.error);
          Logger.error(`Failed to uninstall app ${this.appId}: ${stdout}`);
        }
      });
  }
}
