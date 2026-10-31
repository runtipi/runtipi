import { BadRequestException, Injectable } from '@nestjs/common';
import type { AppInfo } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { gte, valid } from 'semver';
import { ConfigurationService } from '@/core/config/configuration.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsService } from '@/modules/apps/apps.service';
import { DockerService } from '@/modules/docker/docker.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';

const publicEnvironment = new Set([
  'APP_DOMAIN',
  'APP_HOST',
  'APP_PORT',
  'APP_PROTOCOL',
  'APP_EXPOSED',
  'APP_EXPOSED_DOMAIN',
  'APP_LOCAL_DOMAIN',
  'APP_URL',
  'ASSET_URL',
]);

@Injectable()
export class McpAppsService {
  constructor(
    private readonly apps: AppsService,
    private readonly marketplace: MarketplaceService,
    private readonly files: AppFilesManager,
    private readonly env: EnvUtils,
    private readonly docker: DockerService,
    private readonly config: ConfigurationService,
  ) {}

  compatibility(info: Pick<AppInfo, 'min_tipi_version'>) {
    const instanceVersion = this.config.get('version');
    const minimumVersion = info.min_tipi_version ?? null;
    const current = valid(instanceVersion);
    const minimum = minimumVersion ? valid(minimumVersion) : null;
    let compatible: boolean | null = true;
    let reason: string | null = null;

    if (minimumVersion && (!current || !minimum)) {
      compatible = null;
      reason = 'The version requirement could not be evaluated';
    } else if (current && minimum && !gte(current, minimum)) {
      compatible = false;
      reason = `Requires Runtipi ${minimumVersion} or newer; this instance runs ${instanceVersion}`;
    }

    return { compatible, instanceVersion, minimumVersion, reason };
  }

  async search(input: Parameters<MarketplaceService['searchApps']>[0]) {
    const result = await this.marketplace.searchApps(input);

    return {
      ...result,
      data: result.data.map((info) => ({
        urn: info.urn,
        name: info.name,
        version: info.version,
        tipi_version: info.tipi_version,
        min_tipi_version: info.min_tipi_version ?? null,
        short_desc: info.short_desc,
        compatibility: this.compatibility(info),
      })),
    };
  }

  accessUrls({ app, info, metadata }: Omit<Awaited<ReturnType<AppsService['getApp']>>, 'metadata'> & { metadata: { localSubdomain: string } }) {
    if (!app || info.no_gui) return { direct: null, local: null, exposed: null };

    const { internalIp, userSettings } = this.config.getConfig();
    const suffix = info.url_suffix ?? '';
    const tlsPort = userSettings.sslPort === 443 ? '' : `:${userSettings.sslPort}`;
    const port = app.port ?? info.port;
    const host = internalIp.includes(':') && !internalIp.startsWith('[') ? `[${internalIp}]` : internalIp;
    const urls = { direct: null as string | null, local: null as string | null, exposed: null as string | null };

    if (app.openPort && port) urls.direct = `${info.https ? 'https' : 'http'}://${host}:${port}${suffix}`;
    if (app.exposedLocal) urls.local = `https://${metadata.localSubdomain}.${userSettings.localDomain}${tlsPort}${suffix}`;
    if (app.exposed && app.domain) urls.exposed = `https://${app.domain}${tlsPort}${suffix}`;

    return urls;
  }

  restartInfo(pendingRestart: boolean) {
    if (!pendingRestart) return null;

    return {
      reason: 'Saved settings or overrides require an app restart before they are applied to containers.',
      action: 'restart_app',
      diffScope:
        'get_compose_diff and get_config_diff compare installed definitions with catalog templates. They do not compare running container settings and can be empty while a restart is pending.',
    };
  }

  async get(urn: AppUrn) {
    const result = await this.apps.getApp(urn);
    const accessUrls = this.accessUrls(result);
    if (!result.app) return { ...result, compatibility: this.compatibility(result.info), accessUrl: null, accessUrls, runtime: null };

    const [appEnv, runtime] = await Promise.all([
      this.files.getAppEnv(urn),
      this.docker.getAppRuntime(urn).then(
        (containers) => ({ available: true, containers }),
        () => ({ available: false, containers: [], message: 'Container status could not be read. Retry or inspect get_logs.' }),
      ),
    ]);
    const generated = Object.fromEntries(this.env.envStringToMap(appEnv.content ?? ''));
    const updateMinimum = 'minTipiVersion' in result.metadata ? result.metadata.minTipiVersion : undefined;
    const warnings = result.info.form_fields
      .filter((field) => (field.type === 'random' || field.required) && !generated[field.env_variable]?.trim())
      .map((field) => `${field.env_variable} is empty or missing from the generated app environment.`);

    return {
      ...result,
      compatibility: this.compatibility(result.info),
      updateCompatibility: updateMinimum === undefined ? null : this.compatibility({ min_tipi_version: updateMinimum ?? undefined }),
      accessUrl: accessUrls.exposed ?? accessUrls.local ?? accessUrls.direct,
      accessUrls,
      environment: this.visibleEnvironment(generated, false),
      runtime,
      warnings,
      pendingRestartInfo: this.restartInfo(result.app.pendingRestart),
    };
  }

  private visibleEnvironment(environment: object, includeSecrets: boolean) {
    return Object.fromEntries(
      Object.entries(environment).map(([key, value]) => [key, includeSecrets || publicEnvironment.has(key) ? value : '[redacted]']),
    );
  }

  async environment(urn: AppUrn, includeSecrets: boolean) {
    const { app } = await this.apps.getApp(urn);
    if (!app) throw new BadRequestException('Install the app before inspecting its generated environment');

    const [generated, overrides, services] = await Promise.all([
      this.files.getAppEnv(urn),
      this.files.getUserEnv(urn),
      this.docker.getEffectiveAppServices(urn),
    ]);

    return {
      source:
        'Generated app.env and saved compose configuration, including enabled user overrides. Containers may still use older values until restarted.',
      includesSecrets: includeSecrets,
      pendingRestart: app.pendingRestart,
      overridesEnabled: app.userConfigEnabled,
      generated: this.visibleEnvironment(Object.fromEntries(this.env.envStringToMap(generated.content ?? '')), includeSecrets),
      overrides: this.visibleEnvironment(Object.fromEntries(this.env.envStringToMap(overrides.content ?? '')), includeSecrets),
      services: Object.fromEntries(
        Object.entries(services).map(([name, service]) => {
          const environment = service.environment && typeof service.environment === 'object' ? service.environment : {};

          return [
            name,
            {
              environment: this.visibleEnvironment(environment, includeSecrets),
              emptyVariables: Object.entries(environment)
                .filter(([, value]) => value === '' || value === null)
                .map(([key]) => key),
            },
          ];
        }),
      ),
    };
  }
}
