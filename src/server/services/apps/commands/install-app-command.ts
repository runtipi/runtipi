import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import semver from 'semver';
import { Logger } from '@/server/core/Logger';
import { AppEventFormInput } from '@runtipi/shared';
import { StartAppCommand } from './start-app-command';
import { TipiConfig } from '@/server/core/TipiConfig';
import { TranslatedError } from '@/server/utils/errors';
import validator from 'validator';
import { checkAppRequirements, getAppInfo } from '../apps.helpers';

export class InstallAppCommand implements ICommand {
  constructor(
    private appId: string,
    private form: AppEventFormInput,
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {}

  async execute(): Promise<void> {
    const app = await this.queries.getApp(this.appId);

    const { exposed, exposedLocal, openPort, domain, isVisibleOnGuestDashboard } = this.form;

    if (app) {
      const command = new StartAppCommand(this.appId, this.queries, this.eventDispatcher);
      await command.execute();
    } else {
      const apps = await this.queries.getApps();

      if (apps.length >= 6 && TipiConfig.getConfig().demoMode) {
        throw new TranslatedError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
      }

      if (exposed && !domain) {
        throw new TranslatedError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
      }

      if (domain && !validator.isFQDN(domain)) {
        throw new TranslatedError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
      }

      checkAppRequirements(this.appId);

      const appInfo = getAppInfo(this.appId);

      if (!appInfo) {
        throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id: this.appId });
      }

      if (!appInfo.exposable && exposed) {
        throw new TranslatedError('APP_ERROR_APP_NOT_EXPOSABLE', { id: this.appId });
      }

      if ((appInfo.force_expose && !exposed) || (appInfo.force_expose && !domain)) {
        throw new TranslatedError('APP_ERROR_APP_FORCE_EXPOSED', { id: this.appId });
      }

      if (exposed && domain) {
        const appsWithSameDomain = await this.queries.getAppsByDomain(domain, this.appId);

        if (appsWithSameDomain.length > 0) {
          throw new TranslatedError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
        }
      }

      const { version } = TipiConfig.getConfig();
      if (appInfo?.min_tipi_version && semver.valid(version) && semver.lt(version, appInfo.min_tipi_version)) {
        throw new TranslatedError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: this.appId, minVersion: appInfo.min_tipi_version });
      }

      await this.queries.createApp({
        id: this.appId,
        status: 'installing',
        config: this.form,
        version: appInfo.tipi_version,
        exposed: exposed || false,
        domain: domain || null,
        openPort: openPort || false,
        exposedLocal: exposedLocal || false,
        isVisibleOnGuestDashboard,
      });

      // Run script
      void this.eventDispatcher
        .dispatchEventAsync({ type: 'app', command: 'install', appid: this.appId, form: this.form })
        .then(({ success, stdout }) => {
          if (success) {
            this.queries.updateApp(this.appId, { status: 'running' }).catch(Logger.error);
          } else {
            this.queries.deleteApp(this.appId).catch(Logger.error);
            Logger.error(`Failed to install app ${this.appId}: ${stdout}`);
          }
        });
    }
  }
}
