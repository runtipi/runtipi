import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { execFileAsync } from './common/helpers/exec-helpers';
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
import { DOCKERODE } from './modules/docker/docker.module';
import Dockerode from 'dockerode';
import { GithubService } from './utils/github/github.service';
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
    private readonly githubService: GithubService,
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

  public async getVersion() {
    const { version: currentVersion } = this.configuration.getConfig();

    const [githubRelease, releasesSince] = await Promise.all([
      this.githubService.getLatestRelease('runtipi', 'runtipi'),
      this.githubService.getReleasesSince('runtipi', 'runtipi', currentVersion),
    ]);

    return {
      current: currentVersion,
      latest: githubRelease?.version || currentVersion,
      body: githubRelease?.body ?? '',
      releases: releasesSince,
    };
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
    const caCertPath = path.join(tlsFolder, 'ca.pem');
    const caKeyPath = path.join(tlsFolder, 'ca-key.pem');
    const certPath = path.join(tlsFolder, 'cert.pem');
    const keyPath = path.join(tlsFolder, 'key.pem');
    const csrPath = path.join(tlsFolder, 'cert.csr');
    const domainMarkerPath = path.join(tlsFolder, `${data.localDomain}.txt`);

    let migratedLegacyCertificate = false;

    let hasCa = (await this.filesystem.isFile(caCertPath)) && (await this.filesystem.isFile(caKeyPath));

    const hasServerCertificate =
      (await this.filesystem.isFile(domainMarkerPath)) && (await this.filesystem.isFile(certPath)) && (await this.filesystem.isFile(keyPath));

    // Migrate a valid legacy self-signed certificate to the local CA.
    // Existing clients already trust this certificate, so preserving it as the
    // issuer avoids requiring users to install a new CA after upgrading.
    if (!hasCa && hasServerCertificate) {
      const { stdout } = await execFileAsync('openssl', ['x509', '-checkend', '86400', '-noout', '-in', certPath]);

      if (stdout.includes('Certificate will not expire')) {
        const legacyKey = await this.filesystem.readTextFile(keyPath);

        if (legacyKey) {
          await this.filesystem.copyFile(certPath, caCertPath);
          await this.filesystem.writePrivateTextFile(caKeyPath, legacyKey);

          hasCa = true;
          migratedLegacyCertificate = true;

          this.logger.info('Migrated existing TLS certificate to RunTipi local CA');
        }
      } else {
        this.logger.warn('Legacy TLS certificate is expired or will expire soon. Generating a new local CA...');
      }
    }

    if (hasCa && hasServerCertificate && !migratedLegacyCertificate) {
      const { stdout } = await execFileAsync('openssl', ['x509', '-checkend', '86400', '-noout', '-in', certPath]);

      if (stdout.includes('Certificate will not expire')) {
        this.logger.info(`TLS certificate for ${data.localDomain} already exists`);
        return;
      }

      this.logger.warn(`TLS certificate for ${data.localDomain} is expired or will expire soon. Regenerating a new one...`);
    }

    // Remove only the server certificate material and domain markers.
    // Keep the local CA so clients do not need to trust a new CA on renewal.
    const files = await this.filesystem.listFiles(tlsFolder);
    await Promise.all(
      files
        .filter((file) => file === 'cert.pem' || file === 'key.pem' || file === 'cert.csr' || file.endsWith('.txt'))
        .map(async (file) => {
          this.logger.info(`Removing file ${file}`);
          await this.filesystem.removeFile(path.join(tlsFolder, file));
        }),
    );

    const subject = `/O=runtipi.io/OU=IT/CN=*.${data.localDomain}/emailAddress=webmaster@${data.localDomain}`;
    const caSubject = '/O=runtipi.io/OU=IT/CN=RunTipi Local CA';
    const subjectAltName = `DNS:*.${data.localDomain},DNS:${data.localDomain}`;

    try {
      if (!hasCa) {
        this.logger.info('Generating RunTipi local CA');

        const { stderr } = await execFileAsync('openssl', [
          'req',
          '-x509',
          '-newkey',
          'rsa:4096',
          '-keyout',
          caKeyPath,
          '-out',
          caCertPath,
          '-days',
          '3650',
          '-subj',
          caSubject,
          '-addext',
          'basicConstraints=critical,CA:TRUE',
          '-addext',
          'keyUsage=critical,keyCertSign,cRLSign',
          '-nodes',
        ]);

        if (!(await this.filesystem.isFile(caCertPath)) || !(await this.filesystem.isFile(caKeyPath))) {
          this.logger.error('Failed to generate RunTipi local CA');
          this.logger.error(stderr);
          return;
        }

        const caKey = await this.filesystem.readTextFile(caKeyPath);

        if (!caKey) {
          this.logger.error('Failed to read generated RunTipi local CA key');
          return;
        }

        await this.filesystem.writePrivateTextFile(caKeyPath, caKey);
      }

      this.logger.info(`Generating TLS certificate for ${data.localDomain}`);

      await execFileAsync('openssl', [
        'req',
        '-new',
        '-newkey',
        'rsa:4096',
        '-keyout',
        keyPath,
        '-out',
        csrPath,
        '-subj',
        subject,
        '-addext',
        'basicConstraints=critical,CA:FALSE',
        '-addext',
        'keyUsage=critical,digitalSignature,keyEncipherment',
        '-addext',
        'extendedKeyUsage=serverAuth',
        '-addext',
        `subjectAltName=${subjectAltName}`,
        '-nodes',
      ]);

      const { stderr } = await execFileAsync('openssl', [
        'x509',
        '-req',
        '-in',
        csrPath,
        '-CA',
        caCertPath,
        '-CAkey',
        caKeyPath,
        '-CAcreateserial',
        '-out',
        certPath,
        '-days',
        '365',
        '-sha256',
        '-copy_extensions',
        'copy',
      ]);

      if (!(await this.filesystem.isFile(certPath)) || !(await this.filesystem.isFile(keyPath))) {
        this.logger.error(`Failed to generate TLS certificate for ${data.localDomain}`);
        this.logger.error(stderr);
      } else {
        this.logger.info(`Writing txt file for ${data.localDomain}`);
      }

      await this.filesystem.removeFile(csrPath);
      await this.filesystem.writeTextFile(domainMarkerPath, '');
    } catch (error) {
      this.logger.error(error);
    }
  };
}
