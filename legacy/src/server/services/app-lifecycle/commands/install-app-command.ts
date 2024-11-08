import { TipiConfig } from '@/server/core/TipiConfig';
import { TranslatedError } from '@/server/utils/errors';
import { formSchema } from '@runtipi/shared';
import { lt, valid } from 'semver';
import { isFQDN } from 'validator';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { getClass } from 'src/inversify.config';

export class InstallAppCommand implements IAppLifecycleCommand {
  constructor(private params: AppLifecycleCommandParams) {}

  private async sendEvent(appId: string, form: unknown): Promise<void> {
    const logger = getClass('ILogger');
    const { success, stdout } = await this.params.eventDispatcher.dispatchEventAsync({
      type: 'app',
      command: 'install',
      appid: appId,
      form: formSchema.parse(form),
    });

    if (success) {
      await this.params.queries.updateApp(appId, { status: 'running' });
    } else {
      logger.error(`Failed to install app ${appId}: ${stdout}`);
      await this.params.queries.deleteApp(appId);
    }
  }

  private async startApp(appId: string): Promise<void> {
    await this.params.executeOtherCommand('startApp', { appId });
  }

  async execute(params: { appId: string; form: unknown }): Promise<void> {
    const { appId, form } = params;

    const parsedForm = formSchema.parse(form);

    const app = await this.params.queries.getApp(appId);

    if (app) {
      return this.startApp(appId);
    }

    const { exposed, exposedLocal, openPort, domain, isVisibleOnGuestDashboard } = parsedForm;

    const apps = await this.params.queries.getApps();

    if (apps.length >= 6 && TipiConfig.getConfig().demoMode) {
      throw new TranslatedError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
    }

    if (exposed && !domain) {
      throw new TranslatedError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !isFQDN(domain)) {
      throw new TranslatedError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
    }

    const appInfo = await this.params.appFileAccessor.getAppInfoFromAppStore(appId);

    if (!appInfo) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    if (appInfo.supported_architectures?.length && !appInfo.supported_architectures.includes(TipiConfig.getConfig().architecture)) {
      throw new TranslatedError('APP_ERROR_ARCHITECTURE_NOT_SUPPORTED', { id: appId, arch: TipiConfig.getConfig().architecture });
    }

    if (!appInfo.exposable && exposed) {
      throw new TranslatedError('APP_ERROR_APP_NOT_EXPOSABLE', { id: appId });
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatedError('APP_ERROR_APP_FORCE_EXPOSED', { id: appId });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.params.queries.getAppsByDomain(domain, appId);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatedError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
      }
    }

    const { version } = TipiConfig.getConfig();
    if (appInfo?.min_tipi_version && valid(version) && lt(version, appInfo.min_tipi_version)) {
      throw new TranslatedError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appId, minVersion: appInfo.min_tipi_version });
    }

    await this.params.queries.createApp({
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
