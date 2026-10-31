import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { LocalTlsService } from './core/local-tls/local-tls.service';
import { CacheService, ONE_DAY_IN_SECONDS } from './core/cache/cache.service';
import { ConfigurationService } from './core/config/configuration.service';
import { DatabaseService } from './core/database/database.service';
import { FilesystemService } from './core/filesystem/filesystem.service';
import { LoggerService } from './core/logger/logger.service';
import { AppLifecycleService } from './modules/app-lifecycle/app-lifecycle.service';
import { AppStoreService } from './modules/app-stores/app-store.service';
import { MarketplaceService } from './modules/marketplace/marketplace.service';
import { RepoEventsQueue } from './modules/queue/entities/repo-events';
import { SystemEventsQueue } from './modules/queue/entities/system-events';
import { DOCKERODE } from './modules/docker/docker.constants';
import Dockerode from 'dockerode';
import { InstanceService } from './modules/system/instance.service';
import YAML from 'yaml';

@Injectable()
export class AppService {
  constructor(
    private readonly cache: CacheService,
    private readonly configuration: ConfigurationService,
    private readonly logger: LoggerService,
    private readonly repoQueue: RepoEventsQueue,
    private readonly systemEventsQueue: SystemEventsQueue,
    private readonly filesystem: FilesystemService,
    private readonly appStoreService: AppStoreService,
    private readonly marketplaceService: MarketplaceService,
    private readonly databaseService: DatabaseService,
    private readonly appLifecycleService: AppLifecycleService,
    private readonly instance: InstanceService,
    private readonly localTls: LocalTlsService,
    @Inject(DOCKERODE) private docker: Dockerode,
  ) {}

  public async bootstrap() {
    try {
      await this.databaseService.migrate();
      await this.docker.pruneNetworks();

      const { version, userSettings, __prod__ } = this.configuration.getConfig();
      const config = this.configuration.getConfig();
      this.logger.info('Log level', config.userSettings.logLevel);
      this.logger.debug('Starting with configuration', config);

      this.configuration.initSentry({ release: version, allowSentry: userSettings.allowErrorMonitoring });

      await this.logger.flush();

      this.logger.info(`Running version: ${process.env.TIPI_VERSION}`);

      const buster = this.cache.get('buster');
      if (buster !== version) {
        this.logger.info('Clearing cache...');
        this.cache.clear();
        this.cache.set('buster', version, ONE_DAY_IN_SECONDS * 365);
      }

      await this.appStoreService.migrateLegacyRepo();

      this.repoQueue.publish({ command: 'clone_all' });

      await this.marketplaceService.initialize();

      // Every 15 minutes, check for updates to the apps repo
      if (__prod__) {
        this.repoQueue.publishRepeatable({ command: 'update_all' }, '*/15 * * * *');
      }
      this.systemEventsQueue.publishRepeatable({ command: 'sync_app_statuses' }, '*/5 * * * *');

      await this.copyAssets();
      await this.generateTlsCertificates({ localDomain: userSettings.localDomain });

      if (__prod__ && (buster !== version || version === 'nightly')) {
        this.appLifecycleService.restartRunningApps();
      }
    } catch (e) {
      this.logger.error(e);
      Sentry.captureException(e, { tags: { source: 'bootstrap' } });
    }
  }

  public getVersion() {
    return this.instance.getVersion();
  }

  public async copyAssets() {
    const { directories, userSettings } = this.configuration.getConfig();
    const { appDir, dataDir, appDataDir } = directories;

    const assetsFolder = path.join(appDir, 'assets');

    this.logger.info('Creating traefik folders');

    await this.filesystem.createDirectories([
      path.join(dataDir, 'traefik', 'dynamic'),
      path.join(dataDir, 'traefik', 'shared'),
      path.join(dataDir, 'traefik', 'tls'),
    ]);

    if (userSettings.persistTraefikConfig) {
      this.logger.warn('Skipping the copy of traefik files because persistTraefikConfig is set to true');
    } else {
      this.logger.info('Copying traefik files');
      await this.writeTraefikConfig(path.join(assetsFolder, 'traefik', 'traefik.yml'), path.join(dataDir, 'traefik', 'traefik.yml'));
      await this.filesystem.copyFile(
        path.join(assetsFolder, 'traefik', 'dynamic', 'dynamic.yml'),
        path.join(dataDir, 'traefik', 'dynamic', 'dynamic.yml'),
      );
    }

    // Create base folders
    this.logger.info('Creating base folders');
    await this.filesystem.createDirectories([
      path.join(dataDir, 'apps'),
      path.join(dataDir, 'state'),
      path.join(dataDir, 'repos'),
      path.join(dataDir, 'backups'),
      path.join(appDataDir),
    ]);

    // Create media folders
    this.logger.info('Creating media folders');
    await this.filesystem.createDirectories([
      path.join(dataDir, 'media', 'torrents', 'watch'),
      path.join(dataDir, 'media', 'torrents', 'complete'),
      path.join(dataDir, 'media', 'torrents', 'incomplete'),
      path.join(dataDir, 'media', 'usenet', 'watch'),
      path.join(dataDir, 'media', 'usenet', 'complete'),
      path.join(dataDir, 'media', 'usenet', 'incomplete'),
      path.join(dataDir, 'media', 'downloads', 'watch'),
      path.join(dataDir, 'media', 'downloads', 'complete'),
      path.join(dataDir, 'media', 'downloads', 'incomplete'),
      path.join(dataDir, 'media', 'data', 'books'),
      path.join(dataDir, 'media', 'data', 'comics'),
      path.join(dataDir, 'media', 'data', 'movies'),
      path.join(dataDir, 'media', 'data', 'music'),
      path.join(dataDir, 'media', 'data', 'tv'),
      path.join(dataDir, 'media', 'data', 'podcasts'),
      path.join(dataDir, 'media', 'data', 'images'),
      path.join(dataDir, 'media', 'data', 'roms'),
    ]);
  }

  private async writeTraefikConfig(src: string, dest: string) {
    const config = await this.filesystem.readTextFile(src);
    if (!config) {
      await this.filesystem.copyFile(src, dest);
      return;
    }

    const parsed = YAML.parse(config) as {
      entryPoints?: Record<string, { forwardedHeaders?: unknown }>;
    };
    const { trustedProxyIps } = this.configuration.get('traefik');

    for (const entrypoint of ['web', 'websecure']) {
      parsed.entryPoints ??= {};
      parsed.entryPoints[entrypoint] ??= {};
      const entryPoint = parsed.entryPoints[entrypoint];

      const currentForwardedHeaders = entryPoint.forwardedHeaders;
      if (!trustedProxyIps.length) {
        if (currentForwardedHeaders && typeof currentForwardedHeaders === 'object' && !Array.isArray(currentForwardedHeaders)) {
          delete (currentForwardedHeaders as { trustedIPs?: string[] }).trustedIPs;
          if (Object.keys(currentForwardedHeaders).length === 0) {
            delete entryPoint.forwardedHeaders;
          }
        }
        continue;
      }

      if (!currentForwardedHeaders || typeof currentForwardedHeaders !== 'object' || Array.isArray(currentForwardedHeaders)) {
        entryPoint.forwardedHeaders = {};
      }

      const forwardedHeaders = entryPoint.forwardedHeaders as { trustedIPs?: string[] } & Record<string, unknown>;
      forwardedHeaders.trustedIPs = [...new Set(trustedProxyIps)];
    }

    await this.filesystem.writeTextFile(dest, YAML.stringify(parsed));
  }

  public generateTlsCertificates = async (data: { localDomain?: string }) => {
    try {
      await this.localTls.ensure(data.localDomain);
    } catch (error) {
      this.logger.error(error);
    }
  };
}
