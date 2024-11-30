import path from 'node:path';
import { Injectable } from '@nestjs/common';
import Sentry from '@sentry/nestjs';
import { z } from 'zod';
import { LATEST_RELEASE_URL } from './common/constants';
import { execAsync } from './common/helpers/exec-helpers';
import { CacheService } from './core/cache/cache.service';
import { ConfigurationService } from './core/config/configuration.service';
import { FilesystemService } from './core/filesystem/filesystem.service';
import { LoggerService } from './core/logger/logger.service';
import { SocketManager } from './core/socket/socket.service';
import { AppStoreService } from './modules/app-stores/app-store.service';
import { AppsRepository } from './modules/apps/apps.repository';
import { MarketplaceService } from './modules/marketplace/marketplace.service';
import { RepoEventsQueue } from './modules/queue/entities/repo-events';

@Injectable()
export class AppService {
  constructor(
    private readonly cache: CacheService,
    private readonly configuration: ConfigurationService,
    private readonly logger: LoggerService,
    private readonly repoQueue: RepoEventsQueue,
    private readonly socketManager: SocketManager,
    private readonly filesystem: FilesystemService,
    private readonly appStoreService: AppStoreService,
    private readonly appsRepository: AppsRepository,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  public async bootstrap() {
    try {
      const { version, userSettings } = this.configuration.getConfig();

      this.configuration.initSentry({ release: version, allowSentry: userSettings.allowErrorMonitoring });

      await this.logger.flush();

      this.logger.info(`Running version: ${process.env.TIPI_VERSION}`);
      this.logger.info('Generating system env file...');

      const repoId = await this.appStoreService.migrateLegacyRepo();
      if (repoId) {
        await this.appsRepository.updateAppAppStoreIdWhereNull(repoId);
      }

      this.repoQueue.publish({ command: 'clone_all' });

      await this.marketplaceService.initialize();

      // Every 15 minutes, check for updates to the apps repo
      this.repoQueue.publishRepeatable({ command: 'update_all' }, '*/15 * * * *');

      this.socketManager.init();

      await this.copyAssets();
      await this.generateTlsCertificates({ localDomain: userSettings.localDomain });
    } catch (e) {
      Sentry.captureException(e, { tags: { source: 'bootstrap' } });
      this.logger.error(e);
    }
  }

  public async getVersion() {
    const { version: currentVersion } = this.configuration.getConfig();

    try {
      let version = (await this.cache.get('latestVersion')) ?? '';
      let body = (await this.cache.get('latestVersionBody')) ?? '';

      if (!version) {
        const response = await fetch(LATEST_RELEASE_URL);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const res = z.object({ tag_name: z.string(), body: z.string() }).parse(data);

        version = res.tag_name;
        body = res.body;

        await this.cache.set('latestVersion', version, 60 * 60);
        await this.cache.set('latestVersionBody', body, 60 * 60);
      }

      return { current: currentVersion, latest: version, body };
    } catch (e) {
      this.logger.error(e);
      return {
        current: currentVersion,
        latest: currentVersion,
        body: '',
      };
    }
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
      await this.filesystem.copyFile(path.join(assetsFolder, 'traefik', 'traefik.yml'), path.join(dataDir, 'traefik', 'traefik.yml'));
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

  /**
   * Given a domain, generates the TLS certificates for it to be used with Traefik
   *
   * @param {string} data.domain The domain to generate the certificates for
   */
  public generateTlsCertificates = async (data: { localDomain?: string }) => {
    if (!data.localDomain) {
      return;
    }

    const { dataDir } = this.configuration.get('directories');

    const tlsFolder = path.join(dataDir, 'traefik', 'tls');

    // If the certificate already exists, don't generate it again
    if (
      (await this.filesystem.pathExists(path.join(tlsFolder, `${data.localDomain}.txt`))) &&
      (await this.filesystem.pathExists(path.join(tlsFolder, 'cert.pem'))) &&
      (await this.filesystem.pathExists(path.join(tlsFolder, 'key.pem')))
    ) {
      this.logger.info(`TLS certificate for ${data.localDomain} already exists`);
      return;
    }

    // Empty out the folder
    const files = await this.filesystem.listFiles(tlsFolder);
    await Promise.all(
      files.map(async (file) => {
        this.logger.info(`Removing file ${file}`);
        await this.filesystem.removeFile(path.join(tlsFolder, file));
      }),
    );

    const subject = `/O=runtipi.io/OU=IT/CN=*.${data.localDomain}/emailAddress=webmaster@${data.localDomain}`;
    const subjectAltName = `DNS:*.${data.localDomain},DNS:${data.localDomain}`;

    try {
      this.logger.info(`Generating TLS certificate for ${data.localDomain}`);
      const { stderr } = await execAsync(
        `openssl req -x509 -newkey rsa:4096 -keyout ${dataDir}/traefik/tls/key.pem -out ${dataDir}/traefik/tls/cert.pem -days 365 -subj "${subject}" -addext "subjectAltName = ${subjectAltName}" -nodes`,
      );
      if (
        !(await this.filesystem.pathExists(path.join(tlsFolder, 'cert.pem'))) ||
        !(await this.filesystem.pathExists(path.join(tlsFolder, 'key.pem')))
      ) {
        this.logger.error(`Failed to generate TLS certificate for ${data.localDomain}`);
        this.logger.error(stderr);
      } else {
        this.logger.info(`Writing txt file for ${data.localDomain}`);
      }
      await this.filesystem.writeTextFile(path.join(tlsFolder, `${data.localDomain}.txt`), '');
    } catch (error) {
      this.logger.error(error);
    }
  };
}
