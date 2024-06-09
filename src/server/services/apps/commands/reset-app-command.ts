import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TranslatedError } from '@/server/utils/errors';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';

export class ResetAppCommand implements ICommand {
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

    await this.queries.updateApp(this.appId, { status: 'resetting' });

    void this.eventDispatcher
      .dispatchEventAsync({ type: 'app', command: 'reset', appid: this.appId, form: castAppConfig(app.config) })
      .then(({ stdout, success }) => {
        if (success) {
          this.queries.updateApp(this.appId, { status: 'running' }).catch(Logger.error);
        } else {
          this.queries.updateApp(this.appId, { status: 'stopped' }).catch(Logger.error);
          Logger.error(`Failed to reset app ${this.appId}: ${stdout}`);
        }
      });
  }
}
