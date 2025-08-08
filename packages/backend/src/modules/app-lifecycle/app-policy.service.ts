import { Injectable } from '@nestjs/common';
import { TranslatableError } from '@/common/error/translatable-error';
import { appFormSchema } from './dto/app-lifecycle.dto';
import { AppsRepository } from '../apps/apps.repository';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { AppFilesManager } from '../apps/app-files-manager';
import { isFQDN } from 'validator';
import { lt, valid } from 'semver';
import type { AppUrn } from '@runtipi/common/types';

@Injectable()
export class AppPolicyService {
  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly marketplaceService: MarketplaceService,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
  ) {}

  /**
   * Validate and normalize install form for an appUrn.
   * Throws TranslatableError on validation failures.
   * Returns normalized parsedForm and the marketplace appInfo used for defaults.
   */
  public async validateInstall(appUrn: AppUrn, form: unknown) {
    const parsedForm = appFormSchema.parse(form);
    const { exposed, exposedLocal, openPort, domain, port } = parsedForm;

    const { demoMode, version, architecture } = this.config.getConfig();

    const apps = await this.appsRepository.getApps();

    if (demoMode && apps.length >= 6) {
      throw new TranslatableError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
    }

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
    }

    const appInfo = await this.marketplaceService.getAppInfoFromAppStore(appUrn);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    if (appInfo.supported_architectures?.length && !appInfo.supported_architectures.includes(architecture)) {
      throw new TranslatableError('APP_ERROR_ARCHITECTURE_NOT_SUPPORTED', { id: appUrn, arch: architecture });
    }

    if (!appInfo.exposable) {
      // Reset proxy settings if the app is not exposable
      parsedForm.exposed = false;
      parsedForm.exposedLocal = false;
      parsedForm.enableAuth = false;
      parsedForm.domain = undefined;
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appUrn });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.appsRepository.getAppsByDomain(domain);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.appName });
      }
    }

    if (exposedLocal && parsedForm.localSubdomain) {
      const appsWithSameLocalSubdomain = await this.appsRepository.getAppsByLocalSubdomain(parsedForm.localSubdomain);

      if (appsWithSameLocalSubdomain.length > 0) {
        throw new TranslatableError('APP_ERROR_LOCAL_SUBDOMAIN_ALREADY_IN_USE', {
          subdomain: parsedForm.localSubdomain,
          id: appsWithSameLocalSubdomain[0]?.appName,
        });
      }
    }

    if (openPort && port) {
      const appsWithSamePort = await this.appsRepository.getAppsByPort(port);

      if (appsWithSamePort.length > 0) {
        throw new TranslatableError('APP_ERROR_PORT_ALREADY_IN_USE', { port: port.toString(), id: appsWithSamePort[0]?.appName });
      }
    }

    if (appInfo?.min_tipi_version && valid(version) && lt(version, appInfo.min_tipi_version)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: appInfo.min_tipi_version });
    }

    return { parsedForm, appInfo };
  }

  /**
   * Validate and normalize update form for an existing app.
   * Throws TranslatableError on validation failures.
   * Returns parsedForm, the app entity and installed appInfo.
   */
  public async validateUpdate(appUrn: AppUrn, form: unknown) {
    const parsedForm = appFormSchema.parse(form);
    const { exposed, domain, exposedLocal, openPort, port } = parsedForm;

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID');
    }

    const app = await this.appsRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    if (!appInfo.exposable) {
      // Reset proxy settings if the app is not exposable
      parsedForm.exposed = false;
      parsedForm.exposedLocal = false;
      parsedForm.enableAuth = false;
      parsedForm.domain = undefined;
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appUrn });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.appsRepository.getAppsByDomain(domain, app.id);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.appName });
      }
    }

    if (exposedLocal && parsedForm.localSubdomain) {
      const appsWithSameLocalSubdomain = await this.appsRepository.getAppsByLocalSubdomain(parsedForm.localSubdomain, app.id);

      if (appsWithSameLocalSubdomain.length > 0) {
        throw new TranslatableError('APP_ERROR_LOCAL_SUBDOMAIN_ALREADY_IN_USE', {
          subdomain: parsedForm.localSubdomain,
          id: appsWithSameLocalSubdomain[0]?.appName,
        });
      }
    }

    if (openPort && port) {
      const appsWithSamePort = await this.appsRepository.getAppsByPort(port, app.id);

      if (appsWithSamePort.length > 0) {
        throw new TranslatableError('APP_ERROR_PORT_ALREADY_IN_USE', { port: port.toString(), id: appsWithSamePort[0]?.appName });
      }
    }

    return { parsedForm, app, appInfo };
  }
}
