import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { getAppInfo, getUpdateInfo } from '../apps.helpers';
import { TranslatedError } from '@/server/utils/errors';
import semver from 'semver';
import { TipiConfig } from '@/server/core/TipiConfig';
import { StartAppCommand } from './start-app-command';

export class UpdateAppCommand implements ICommand {
  constructor(
    private appId: string,
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {}

  async execute(): Promise<void> {
    const app = await this.queries.getApp(this.appId);
    const appStatusBeforeUpdate = app?.status;

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: this.appId });
    }

    const { version } = TipiConfig.getConfig();

    const { minTipiVersion } = getUpdateInfo(app.id);
    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatedError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: this.appId, minVersion: minTipiVersion });
    }

    await this.queries.updateApp(this.appId, { status: 'updating' });

    void this.eventDispatcher
      .dispatchEventAsync({
        type: 'app',
        command: 'update',
        appid: this.appId,
        form: castAppConfig(app.config),
      })
      .then(({ success, stdout }) => {
        if (success) {
          const appInfo = getAppInfo(app.id, app.status);

          this.queries.updateApp(this.appId, { version: appInfo?.tipi_version }).catch(Logger.error);
          if (appStatusBeforeUpdate === 'running') {
            const command = new StartAppCommand(this.appId, this.queries, this.eventDispatcher);
            command.execute().catch(Logger.error);
          } else {
            this.queries.updateApp(this.appId, { status: appStatusBeforeUpdate }).catch(Logger.error);
          }
        } else {
          this.queries.updateApp(this.appId, { status: 'stopped' }).catch(Logger.error);
          Logger.error(`Failed to update app ${this.appId}: ${stdout}`);
        }
      });
  }
}
