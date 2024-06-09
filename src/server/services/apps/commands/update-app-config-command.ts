import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { AppEventFormInput } from '@runtipi/shared';
import { TranslatedError } from '@/server/utils/errors';
import validator from 'validator';
import { getAppInfo } from '../apps.helpers';

export class UpdateAppConfigCommand implements ICommand {
  constructor(
    private appId: string,
    private form: AppEventFormInput,
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {}

  async execute(): Promise<void> {
    const { exposed, domain } = this.form;

    if (exposed && !domain) {
      throw new TranslatedError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatedError('APP_ERROR_DOMAIN_NOT_VALID');
    }

    const app = await this.queries.getApp(this.appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: this.appId });
    }

    const appInfo = getAppInfo(app.id, app.status);

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

    const { success } = await this.eventDispatcher.dispatchEventAsync({ type: 'app', command: 'generate_env', appid: this.appId, form: this.form });

    if (success) {
      await this.queries.updateApp(this.appId, {
        exposed: exposed || false,
        exposedLocal: this.form.exposedLocal || false,
        openPort: this.form.openPort || false,
        domain: domain || null,
        config: this.form,
        isVisibleOnGuestDashboard: this.form.isVisibleOnGuestDashboard,
      });

      return;
    }

    throw new TranslatedError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: this.appId });
  }
}
