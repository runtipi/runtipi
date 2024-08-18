import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { TipiConfig } from '@/server/core/TipiConfig';
import { TranslatedError } from '@/server/utils/errors';
import type { AppStatus } from '@runtipi/db';
import type { AppEventFormInput } from '@runtipi/shared';
import semver from 'semver';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { getClass } from 'src/inversify.config';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export class UpdateAppCommand implements IAppLifecycleCommand {
  constructor(private params: AppLifecycleCommandParams) {}

  private async sendEvent(params: {
    appId: string;
    form: AppEventFormInput;
    appStatusBeforeUpdate: AppStatus;
    performBackup: boolean;
  }): Promise<void> {
    const logger = getClass('ILogger');
    const { appId, form, appStatusBeforeUpdate, performBackup } = params;

    const { success, stdout } = await this.params.eventDispatcher.dispatchEventAsync(
      { type: 'app', command: 'update', appid: appId, form, performBackup },
      performBackup ? FIFTEEN_MINUTES : undefined,
    );

    if (success) {
      const appInfo = await this.params.appDataService.getInstalledInfo(appId);

      await this.params.queries.updateApp(appId, { version: appInfo?.tipi_version });

      if (appStatusBeforeUpdate === 'running') {
        await this.params.executeOtherCommand('startApp', { appId });
      } else {
        await this.params.queries.updateApp(appId, { status: appStatusBeforeUpdate });
      }
    } else {
      await this.params.queries.updateApp(appId, { status: 'stopped' });
      logger.error(`Failed to update app ${appId}: ${stdout}`);
    }
  }

  async execute(params: { appId: string; performBackup: boolean }): Promise<void> {
    const { appId, performBackup } = params;
    const app = await this.params.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const { version } = TipiConfig.getConfig();

    const { minTipiVersion } = await this.params.appDataService.getUpdateInfo(appId);
    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatedError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appId, minVersion: minTipiVersion });
    }

    await this.params.queries.updateApp(appId, { status: 'updating' });

    void this.sendEvent({ appId, form: castAppConfig(app.config), appStatusBeforeUpdate: app.status || 'missing', performBackup });
  }
}
