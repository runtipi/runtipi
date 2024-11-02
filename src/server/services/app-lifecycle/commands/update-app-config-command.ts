import { TranslatedError } from '@/server/utils/errors';
import validator from 'validator';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { formSchema } from '@runtipi/shared';

export class UpdateAppConfigCommand implements IAppLifecycleCommand {
  constructor(private params: AppLifecycleCommandParams) {}

  async execute(params: { appId: string; form: unknown }): Promise<void> {
    const { appId, form } = params;

    const parsedForm = formSchema.parse(form);

    const { exposed, domain } = parsedForm;

    if (exposed && !domain) {
      throw new TranslatedError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatedError('APP_ERROR_DOMAIN_NOT_VALID');
    }

    const app = await this.params.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const appInfo = await this.params.appFileAccessor.getInstalledAppInfo(appId);

    if (!appInfo) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
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

    const { success } = await this.params.eventDispatcher.dispatchEventAsync({
      type: 'app',
      command: 'generate_env',
      appid: appId,
      form: parsedForm,
    });

    if (!success) {
      throw new TranslatedError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appId });
    }

    await this.params.queries.updateApp(appId, {
      exposed: exposed || false,
      exposedLocal: parsedForm.exposedLocal || false,
      openPort: parsedForm.openPort || false,
      domain: domain || null,
      config: parsedForm,
      isVisibleOnGuestDashboard: parsedForm.isVisibleOnGuestDashboard,
    });
  }
}
