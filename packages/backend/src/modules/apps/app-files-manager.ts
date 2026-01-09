import path from 'node:path';
import { APP_GENERATED_COMPOSE_FILENAME, APP_REL_COMPOSE_FILENAME } from '@/common/constants';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { execAsync } from '@/common/helpers/exec-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { appInfoSchema, convertLegacyToYaml, dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';

@Injectable()
export class AppFilesManager {
  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
  ) {}

  private getInstalledAppsFolder() {
    const { directories } = this.configuration.getConfig();

    return path.join(directories.dataDir, 'apps');
  }

  public getAppPaths(appUrn: AppUrn) {
    const { directories } = this.configuration.getConfig();

    const { appStoreId, appName } = extractAppUrn(appUrn);

    return {
      appDataDir: path.join(directories.appDataDir, appStoreId, appName),
      appInstalledDir: path.join(this.getInstalledAppsFolder(), appStoreId, appName),
    };
  }

  /**
   * Get the app info from the installed apps apps
   * @param id - The app id
   */
  public async getInstalledAppInfo(appUrn: AppUrn) {
    try {
      const { appInstalledDir } = this.getAppPaths(appUrn);

      if (await this.filesystem.pathExists(path.join(appInstalledDir, 'config.json'))) {
        const configFile = await this.filesystem.readTextFile(path.join(appInstalledDir, 'config.json'));

        const config = JSON.parse(configFile ?? '{}');
        const parsedConfig = appInfoSchema({ ...config, urn: appUrn });

        if (parsedConfig instanceof type.errors) {
          this.logger.error(`App ${appUrn} config error:`);
          this.logger.error(parsedConfig.summary);
          return null;
        }

        if (parsedConfig.available) {
          const description = (await this.filesystem.readTextFile(path.join(appInstalledDir, 'metadata', 'description.md'))) ?? '';

          return { ...parsedConfig, description };
        }
      }
    } catch (_) {
      return null;
    }

    return null;
  }

  /**
   * Get the docker-compose.json file content from the installed app
   * @param appUrn - The app id
   * @returns The content of docker-compose.yml as a string, or null if not found
   */
  public async getGeneratedDockerComposeYaml(appUrn: AppUrn) {
    const { appInstalledDir } = this.getAppPaths(appUrn);
    const dockerComposePath = path.join(appInstalledDir, APP_GENERATED_COMPOSE_FILENAME);

    try {
      if (await this.filesystem.pathExists(dockerComposePath)) {
        const content = await this.filesystem.readTextFile(dockerComposePath);
        return { path: dockerComposePath, content };
      }

      // Check for legacy generated file (docker-compose.yml without x-runtipi)
      const legacyPath = path.join(appInstalledDir, APP_REL_COMPOSE_FILENAME);
      if (await this.filesystem.pathExists(legacyPath)) {
        const legacyContent = await this.filesystem.readYamlFile(legacyPath);
        // If it DOES NOT have x-runtipi, it is the old generated file
        if (legacyContent && typeof legacyContent === 'object' && !('x-runtipi' in legacyContent)) {
          const content = await this.filesystem.readTextFile(legacyPath);
          return { path: legacyPath, content };
        }
      }
    } catch (error) {
      this.logger.error(`Error getting ${APP_GENERATED_COMPOSE_FILENAME} for installed app ${appUrn}:`, error);
    }

    return { path: dockerComposePath, content: null };
  }

  /**
   * Get the source docker-compose.yml file content from the installed app
   * @param appUrn - The app id
   * @returns The content as a DynamicComposeSchemaYaml object and path
   */
  public async getSourceDockerComposeYaml(appUrn: AppUrn) {
    const { appInstalledDir } = this.getAppPaths(appUrn);

    // 1. Try new source name: docker-compose.yml
    const appYamlPath = path.join(appInstalledDir, APP_REL_COMPOSE_FILENAME);

    let content = null;

    try {
      if (await this.filesystem.pathExists(appYamlPath)) {
        content = await this.filesystem.readYamlFile(appYamlPath);
      }
    } catch (error) {
      this.logger.error(`Error getting ${APP_REL_COMPOSE_FILENAME} for installed app ${appUrn}:`, error);
    }

    // Check if it has metadata (valid source file)
    if (content && typeof content === 'object' && 'x-runtipi' in content) {
      const compose = dynamicComposeSchemaYaml(content);

      if (compose instanceof type.errors) {
        throw new Error(`Invalid ${APP_REL_COMPOSE_FILENAME} format for app ${appUrn}.`);
      }

      return { path: appYamlPath, content: compose };
    }

    // 2. Fallback to legacy source: docker-compose.json
    const dockerComposeLegacyPath = path.join(appInstalledDir, 'docker-compose.json');

    try {
      if (await this.filesystem.pathExists(dockerComposeLegacyPath)) {
        const jsonContent = await this.filesystem.readJsonFile(dockerComposeLegacyPath);

        const compose = dynamicComposeSchemaYaml(convertLegacyToYaml(jsonContent));

        if (compose instanceof type.errors) {
          throw new Error(`Invalid docker-compose.json format for app ${appUrn}.`);
        }

        return { path: dockerComposeLegacyPath, content: compose };
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.json for installed app ${appUrn}:`, error);
    }

    return { path: appYamlPath, content: null };
  }

  /**
   * Write the docker-compose.yml file to the installed app folder
   * @param appUrn - The app id
   * @param composeFile - The content of the docker-compose.yml file
   */
  public async writeDockerComposeYml(appUrn: AppUrn, composeFile: string) {
    const { appInstalledDir } = this.getAppPaths(appUrn);
    const dockerComposePath = path.join(appInstalledDir, APP_GENERATED_COMPOSE_FILENAME);

    await this.filesystem.writeTextFile(dockerComposePath, composeFile);
  }

  public async deleteAppFolder(appUrn: AppUrn) {
    const { appInstalledDir } = this.getAppPaths(appUrn);
    await this.filesystem.removeDirectory(appInstalledDir);
  }

  public async deleteAppDataDir(appUrn: AppUrn) {
    const { appDataDir } = this.getAppPaths(appUrn);
    await this.filesystem.removeDirectory(appDataDir);
  }

  public async createAppDataDir(appUrn: AppUrn) {
    const { appDataDir } = this.getAppPaths(appUrn);
    await this.filesystem.createDirectory(appDataDir);
  }

  /**
   * Set the permissions for the app data directory
   * @param appUrn - The app id
   */
  public async setAppDataDirPermissions(appUrn: AppUrn) {
    const { appDataDir } = this.getAppPaths(appUrn);

    await execAsync(`chmod -Rf a+rwx ${appDataDir}`).catch(() => {
      this.logger.error(`Error setting permissions for app ${appUrn}`);
    });
  }

  public async getAppEnv(appUrn: AppUrn) {
    const { appDataDir } = this.getAppPaths(appUrn);

    const envPath = path.join(appDataDir, 'app.env');

    let env = '';
    if (await this.filesystem.pathExists(envPath)) {
      env = (await this.filesystem.readTextFile(envPath)) ?? '';
    }

    return { path: envPath, content: env };
  }

  public async writeAppEnv(appUrn: AppUrn, env: string) {
    const { appDataDir } = this.getAppPaths(appUrn);

    const envPath = path.join(appDataDir, 'app.env');

    await this.filesystem.writeTextFile(envPath, env);
  }

  /**
   * Get the user env file content
   * @param appUrn - The app id
   */
  public async getUserEnv(appUrn: AppUrn) {
    const { directories } = this.configuration.getConfig();

    const { appStoreId, appName } = extractAppUrn(appUrn);

    const userEnvFile = path.join(directories.dataDir, 'user-config', appStoreId, appName, 'app.env');
    let content = null;

    if (await this.filesystem.pathExists(userEnvFile)) {
      content = await this.filesystem.readTextFile(userEnvFile);
    }

    return { path: userEnvFile, content };
  }

  /**
   * Get the user compose file content
   * @param appUrn - The app id
   */
  public async getUserComposeFile(appUrn: AppUrn) {
    const { directories } = this.configuration.getConfig();

    const { appStoreId, appName } = extractAppUrn(appUrn);

    const userComposeFile = path.join(directories.dataDir, 'user-config', appStoreId, appName, 'docker-compose.yml');
    let content = null;

    if (await this.filesystem.pathExists(userComposeFile)) {
      content = await this.filesystem.readTextFile(userComposeFile);
    }

    return { path: userComposeFile, content };
  }

  /**
   * Get the config.json file content from the installed app
   * @param appUrn - The app id
   * @returns The content of config.json as a string, or null if not found
   */
  public async getConfigJson(appUrn: AppUrn) {
    const { appInstalledDir } = this.getAppPaths(appUrn);
    const configPath = path.join(appInstalledDir, 'config.json');

    let content = null;
    try {
      if (await this.filesystem.pathExists(configPath)) {
        content = await this.filesystem.readJsonFile(configPath);
      }
    } catch (error) {
      this.logger.error(`Error getting config.json for installed app ${appUrn}:`, error);
    }

    return { path: configPath, content };
  }
}
