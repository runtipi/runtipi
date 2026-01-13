import path from 'node:path';
import { APP_REL_COMPOSE_FILENAME } from '@/common/constants';
import type { ConfigurationService } from '@/core/config/configuration.service';
import type { AppStore } from '@/core/database/drizzle/types';
import type { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { appInfoSchema, convertLegacyToYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import type { AppPathsService } from '../apps/app-paths.service';

export class AppStoreFilesManager {
  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private readonly appPaths: AppPathsService,
    public readonly storeConfig: AppStore,
  ) {}

  public getAppPaths(appUrn: AppUrn) {
    return this.appPaths.getAppPaths(appUrn);
  }

  /**
   * Get the app info from the app store
   * @param appUrn - The app id
   */
  public async getAppInfoFromAppStore(appUrn: AppUrn) {
    try {
      const { appRepoDir } = this.getAppPaths(appUrn);

      if (await this.filesystem.pathExists(path.join(appRepoDir, 'config.json'))) {
        const configFile = await this.filesystem.readTextFile(path.join(appRepoDir, 'config.json'));

        const config = JSON.parse(configFile ?? '{}');
        const parsedConfig = appInfoSchema({ ...config, urn: appUrn });

        if (parsedConfig instanceof type.errors) {
          this.logger.debug(`App ${appUrn} config error:`);
          this.logger.debug(parsedConfig.summary);
          return null;
        }

        if (parsedConfig.available) {
          const description = (await this.filesystem.readTextFile(path.join(appRepoDir, 'metadata', 'description.md'))) ?? '';
          return { ...parsedConfig, description };
        }
      }
    } catch (error) {
      this.logger.error(`Error getting app info from app store for ${appUrn}:`, error);
    }
  }

  public async getAppInfoFromAppStoreOrInstalled(appUrn: AppUrn) {
    const appInfo = await this.getAppInfoFromAppStore(appUrn);
    if (appInfo) {
      return appInfo;
    }

    const { appInstalledDir } = this.getAppPaths(appUrn);

    if (await this.filesystem.pathExists(path.join(appInstalledDir, 'config.json'))) {
      const configFile = await this.filesystem.readTextFile(path.join(appInstalledDir, 'config.json'));

      const config = JSON.parse(configFile ?? '{}');
      const parsedConfig = appInfoSchema({ ...config, urn: appUrn });

      if (parsedConfig instanceof type.errors) {
        this.logger.debug(`App ${appUrn} installed config error:`);
        this.logger.debug(parsedConfig.summary);
        return null;
      }

      if (parsedConfig.available) {
        const description = (await this.filesystem.readTextFile(path.join(appInstalledDir, 'metadata', 'description.md'))) ?? '';
        return { ...parsedConfig, description };
      }
    }
  }

  public async getSourceDockerComposeYaml(appUrn: AppUrn) {
    const { appRepoDir } = this.getAppPaths(appUrn);

    const appYamlPath = path.join(appRepoDir, APP_REL_COMPOSE_FILENAME);

    let content = null;

    try {
      if (await this.filesystem.pathExists(appYamlPath)) {
        content = await this.filesystem.readYamlFile(appYamlPath);
      }
    } catch (error) {
      this.logger.error(`Error getting ${APP_REL_COMPOSE_FILENAME} for app ${appUrn} from repo ${this.storeConfig.slug}:`, error);
    }

    if (content && typeof content === 'object' && 'x-runtipi' in content) {
      return { path: appYamlPath, content };
    }

    // Fallback to legacy docker-compose.json
    const dockerComposePath = path.join(appRepoDir, 'docker-compose.json');

    try {
      if (await this.filesystem.pathExists(dockerComposePath)) {
        content = await this.filesystem.readJsonFile(dockerComposePath);
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.json for app ${appUrn} from repo ${this.storeConfig.slug}:`, error);
    }

    return { path: dockerComposePath, content: convertLegacyToYaml(content) };
  }

  /**
   *  This function returns an object containing information about the updates available for the app with the provided id.
   *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
   *  If the config.json file is invalid, it returns null.
   *  If the app is not found, it returns null.
   *
   *  @param {string} appUrn - The app id.
   */
  public async getAppUpdateInfo(appUrn: AppUrn) {
    const config = await this.getAppInfoFromAppStore(appUrn);
    const paths = this.getAppPaths(appUrn);

    if (config) {
      return {
        ...paths,
        latestVersion: config.tipi_version,
        minTipiVersion: config.min_tipi_version ?? null,
        latestDockerVersion: config.version,
      };
    }

    return {
      latestVersion: 0,
      latestDockerVersion: '0.0.0',
      minTipiVersion: null,
      ...paths,
    };
  }

  /**
   * Get the list of available app ids
   * @returns The list of app ids
   */
  public async getAvailableAppUrns() {
    const appsRepoFolder = this.appPaths.getAppStoreFolder(this.storeConfig.slug);

    if (!(await this.filesystem.pathExists(appsRepoFolder))) {
      this.logger.error(`Apps repo ${this.storeConfig.slug} not found. Make sure your repo is configured correctly.`);
      return [];
    }

    const appsDir = await this.filesystem.listFiles(appsRepoFolder);
    const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json', '.DS_Store'];

    return appsDir.filter((app) => !skippedFiles.includes(app)).map((app) => `${app}:${this.storeConfig.slug}` as AppUrn);
  }

  public async getAppImage(appUrn: AppUrn) {
    const { appInstalledDir, appRepoDir } = this.getAppPaths(appUrn);
    const { appDir } = this.configuration.get('directories');

    const defaultFilePath = path.join(appInstalledDir, 'metadata', 'logo.jpg');
    const appRepoFilePath = path.join(appRepoDir, 'metadata', 'logo.jpg');

    let filePath = path.join(appDir, 'assets', 'default-app-logo.jpg');

    if (await this.filesystem.pathExists(defaultFilePath)) {
      filePath = defaultFilePath;
    } else if (await this.filesystem.pathExists(appRepoFilePath)) {
      filePath = appRepoFilePath;
    }

    const file = await this.filesystem.readBinaryFile(filePath);
    const etag = await this.filesystem.getFileEtag(filePath);

    return { image: file, etag };
  }

  public async getConfigJson(appUrn: AppUrn) {
    const { appRepoDir } = this.getAppPaths(appUrn);

    const configPath = path.join(appRepoDir, 'config.json');

    let content = null;
    try {
      if (await this.filesystem.pathExists(configPath)) {
        content = await this.filesystem.readJsonFile(configPath);
      }
    } catch (error) {
      this.logger.error(`Error getting config.json for app ${appUrn} from repo ${this.storeConfig.slug}:`, error);
    }

    return { path: configPath, content };
  }
}
