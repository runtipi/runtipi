import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { TranslatedError } from '@/server/utils/errors';

export class StartAppCommand implements ICommand {
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

    await this.queries.updateApp(this.appId, { status: 'starting' });
    void this.eventDispatcher
      .dispatchEventAsync({
        type: 'app',
        command: 'start',
        appid: this.appId,
        form: castAppConfig(app.config),
      })
      .then(({ success, stdout }) => {
        if (success) {
          this.queries.updateApp(this.appId, { status: 'running' }).catch(Logger.error);
        } else {
          Logger.error(`Failed to start app ${this.appId}: ${stdout}`);
          this.queries.updateApp(this.appId, { status: 'stopped' }).catch(Logger.error);
        }
      });
  }
}
