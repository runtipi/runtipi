import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import semver from 'semver';
import { Logger } from '@/server/core/Logger';
import { AppEventFormInput } from '@runtipi/shared';
import { StartAppCommand } from './start-app-command';
import { TipiConfig } from '@/server/core/TipiConfig';
import { TranslatedError } from '@/server/utils/errors';
import validator from 'validator';
import { checkAppRequirements } from '../../app-catalog/apps.helpers';

export class InstallAppCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, form: AppEventFormInput): Promise<void> {
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'install', appid: appId, form });

    if (success) {
      await this.queries.updateApp(appId, { status: 'running' });
    } else {
      Logger.error(`Failed to install app ${appId}: ${stdout}`);
      await this.queries.deleteApp(appId);
    }
  }

  private async startApp(appId: string): Promise<void> {
    const command = new StartAppCommand({ queries: this.queries, eventDispatcher: this.eventDispatcher });
    await command.execute({ appId });
  }

  async execute(params: { appId: string; form: AppEventFormInput }): Promise<void> {
    const { appId, form } = params;

    const app = await this.queries.getApp(appId);

    if (app) {
      return this.startApp(appId);
    }

    const { exposed, exposedLocal, openPort, domain, isVisibleOnGuestDashboard } = form;
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

    const appInfo = checkAppRequirements(appId);

    if (!appInfo.exposable && exposed) {
      throw new TranslatedError('APP_ERROR_APP_NOT_EXPOSABLE', { id: appId });
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatedError('APP_ERROR_APP_FORCE_EXPOSED', { id: appId });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.queries.getAppsByDomain(domain, appId);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatedError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
      }
    }

    const { version } = TipiConfig.getConfig();
    if (appInfo?.min_tipi_version && semver.valid(version) && semver.lt(version, appInfo.min_tipi_version)) {
      throw new TranslatedError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appId, minVersion: appInfo.min_tipi_version });
    }

    await this.queries.createApp({
      id: appId,
      status: 'installing',
      config: form,
      version: appInfo.tipi_version,
      exposed: exposed || false,
      domain: domain || null,
      openPort: openPort || false,
      exposedLocal: exposedLocal || false,
      isVisibleOnGuestDashboard,
    });

    void this.sendEvent(appId, form);
  }
}
