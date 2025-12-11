import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { AppInfo } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { lt, valid } from 'semver';
import validator from 'validator';
import { AppsRepository } from '../../apps/apps.repository';
import { appFormSchema } from '../dto/app-lifecycle.dto';

type ParsedForm = typeof appFormSchema.infer;

@Injectable()
export class AppValidationService {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly config: ConfigurationService,
    private readonly logger: LoggerService,
  ) {}

  private validateDomainSettings(form: ParsedForm) {
    const { exposed, domain } = form;

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
    }
  }

  private validateArchitecture(appUrn: AppUrn, appInfo: AppInfo) {
    const { architecture } = this.config.getConfig();

    if (appInfo.supported_architectures?.length && !appInfo.supported_architectures.includes(architecture)) {
      throw new TranslatableError('APP_ERROR_ARCHITECTURE_NOT_SUPPORTED', { id: appUrn, arch: architecture });
    }
  }

  private validateMinTipiVersion(appUrn: AppUrn, minTipiVersion?: string | null) {
    const { version } = this.config.getConfig();

    if (minTipiVersion && valid(version) && lt(version, minTipiVersion)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: minTipiVersion });
    }
  }

  private validateExposability(appUrn: AppUrn, appInfo: AppInfo, form: ParsedForm) {
    const { exposed, exposedLocal, enableAuth } = form;

    if (!appInfo.exposable) {
      if (exposed || exposedLocal || enableAuth) {
        this.logger.warn(`App ${appUrn} is not exposable, resetting proxy settings`);
      }
      form.exposed = false;
      form.exposedLocal = false;
      form.enableAuth = false;
      form.domain = undefined;
    }
  }

  private validateForceExpose(appUrn: AppUrn, appInfo: AppInfo, exposed?: boolean) {
    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appUrn });
    }
  }

  private async validateDomainUniqueness(domain: string, excludeAppId?: number) {
    const appsWithSameDomain = await this.appRepository.getAppsByDomain(domain, excludeAppId);

    if (appsWithSameDomain.length > 0) {
      throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.appName });
    }
  }

  private async validateLocalSubdomainUniqueness(subdomain: string, excludeAppId?: number) {
    const appsWithSameLocalSubdomain = await this.appRepository.getAppsByLocalSubdomain(subdomain, excludeAppId);

    if (appsWithSameLocalSubdomain.length > 0) {
      throw new TranslatableError('APP_ERROR_LOCAL_SUBDOMAIN_ALREADY_IN_USE', {
        subdomain,
        id: appsWithSameLocalSubdomain[0]?.appName,
      });
    }
  }

  private async validatePortUniqueness(port: number, excludeAppId?: number) {
    const appsWithSamePort = await this.appRepository.getAppsByPort(port, excludeAppId);

    if (appsWithSamePort.length > 0) {
      throw new TranslatableError('APP_ERROR_PORT_ALREADY_IN_USE', { port: port.toString(), id: appsWithSamePort[0]?.appName });
    }
  }

  private async validateDemoModeLimit() {
    const { demoMode } = this.config.getConfig();
    const apps = await this.appRepository.getApps();

    if (demoMode && apps.length >= 6) {
      throw new TranslatableError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
    }
  }

  public async validateInstallSettings(appUrn: AppUrn, appInfo: AppInfo, form: ParsedForm) {
    await this.validateDemoModeLimit();
    this.validateDomainSettings(form);
    this.validateArchitecture(appUrn, appInfo);
    this.validateMinTipiVersion(appUrn, appInfo.min_tipi_version);
    this.validateExposability(appUrn, appInfo, form);
    this.validateForceExpose(appUrn, appInfo, form.exposed);

    if (form.exposed && form.domain) {
      await this.validateDomainUniqueness(form.domain);
    }

    if (form.exposedLocal && form.localSubdomain) {
      await this.validateLocalSubdomainUniqueness(form.localSubdomain);
    }

    if (form.openPort && form.port) {
      await this.validatePortUniqueness(form.port);
    }
  }

  public async validateUpdateConfigSettings(appUrn: AppUrn, appInfo: AppInfo, form: ParsedForm, excludeAppId: number) {
    this.validateDomainSettings(form);
    this.validateExposability(appUrn, appInfo, form);
    this.validateForceExpose(appUrn, appInfo, form.exposed);

    if (form.exposed && form.domain) {
      await this.validateDomainUniqueness(form.domain, excludeAppId);
    }

    if (form.exposedLocal && form.localSubdomain) {
      await this.validateLocalSubdomainUniqueness(form.localSubdomain, excludeAppId);
    }

    if (form.openPort && form.port) {
      await this.validatePortUniqueness(form.port, excludeAppId);
    }
  }
}
