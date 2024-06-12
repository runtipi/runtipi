import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { Logger } from '@/server/core/Logger';
import { TranslatedError } from '@/server/utils/errors';
import semver from 'semver';
import { TipiConfig } from '@/server/core/TipiConfig';
import { StartAppCommand } from './start-app-command';
import { getAppInfo, getUpdateInfo } from '../../app-catalog/apps.helpers';

export class UpdateAppCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.queries.getApp(appId);
    const appStatusBeforeUpdate = app?.status;

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const { version } = TipiConfig.getConfig();

    const { minTipiVersion } = getUpdateInfo(app.id);
    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatedError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appId, minVersion: minTipiVersion });
    }

    await this.queries.updateApp(appId, { status: 'updating' });

    void this.eventDispatcher
      .dispatchEventAsync({
        type: 'app',
        command: 'update',
        appid: appId,
        form: castAppConfig(app.config),
      })
      .then(({ success, stdout }) => {
        if (success) {
          const appInfo = getAppInfo(app.id, app.status);

          this.queries.updateApp(appId, { version: appInfo?.tipi_version }).catch(Logger.error);
          if (appStatusBeforeUpdate === 'running') {
            const command = new StartAppCommand({ queries: this.queries, eventDispatcher: this.eventDispatcher });
            command.execute({ appId }).catch(Logger.error);
          } else {
            this.queries.updateApp(appId, { status: appStatusBeforeUpdate }).catch(Logger.error);
          }
        } else {
          this.queries.updateApp(appId, { status: 'stopped' }).catch(Logger.error);
          Logger.error(`Failed to update app ${appId}: ${stdout}`);
        }
      });
  }
}
