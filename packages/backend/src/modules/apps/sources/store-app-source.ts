import path from 'node:path';
import { APP_REL_COMPOSE_FILENAME } from '@/common/constants';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { appInfoSchema, convertLegacyToYaml, dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import type { AppSource } from './app-source.interface';
import { AppPathsService } from '../app-paths.service';

export class StoreAppSource implements AppSource {
  constructor(
    private readonly appUrn: AppUrn,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private readonly configuration: ConfigurationService,
    private readonly appPaths: AppPathsService,
  ) {}

  getAppUrn() {
    return this.appUrn;
  }

  async getAppInfo() {
    const appRepoDir = this.appPaths.getAppRepoDir(this.appUrn);
    const configPath = path.join(appRepoDir, 'config.json');

    try {
      if (await this.filesystem.pathExists(configPath)) {
        const configFile = await this.filesystem.readTextFile(configPath);
        const config = JSON.parse(configFile ?? '{}');
        const parsedConfig = appInfoSchema({ ...config, urn: this.appUrn });

        if (parsedConfig instanceof type.errors) {
          this.logger.error(`App ${this.appUrn} config error: ${parsedConfig.summary}`);
          return null;
        }

        return parsedConfig;
      }
    } catch (error) {
      this.logger.error(`Error getting app info for ${this.appUrn}:`, error);
    }
    return null;
  }

  async getCompose() {
    const appRepoDir = this.appPaths.getAppRepoDir(this.appUrn);
    const appYamlPath = path.join(appRepoDir, APP_REL_COMPOSE_FILENAME);

    let content: unknown = null;

    try {
      if (await this.filesystem.pathExists(appYamlPath)) {
        content = await this.filesystem.readYamlFile(appYamlPath);
      }
    } catch (error) {
      this.logger.error(`Error getting ${APP_REL_COMPOSE_FILENAME} for app ${this.appUrn}:`, error);
    }

    if (content && typeof content === 'object' && 'x-runtipi' in content) {
      const parsed = dynamicComposeSchemaYaml(content);
      return parsed instanceof type.errors ? null : parsed;
    }

    // Fallback to legacy docker-compose.json
    const dockerComposePath = path.join(appRepoDir, 'docker-compose.json');

    try {
      if (await this.filesystem.pathExists(dockerComposePath)) {
        content = await this.filesystem.readJsonFile(dockerComposePath);
        const yamlContent = convertLegacyToYaml(content);
        const parsed = dynamicComposeSchemaYaml(yamlContent);
        return parsed instanceof type.errors ? null : parsed;
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.json for app ${this.appUrn}:`, error);
    }

    return null;
  }

  async getLogo() {
    const { appRepoDir } = this.appPaths.getAppPaths(this.appUrn);
    const { appDir } = this.configuration.get('directories');

    const appRepoFilePath = path.join(appRepoDir, 'metadata', 'logo.jpg');
    let filePath = path.join(appDir, 'assets', 'default-app-logo.jpg');

    if (await this.filesystem.pathExists(appRepoFilePath)) {
      filePath = appRepoFilePath;
    }

    const file = await this.filesystem.readBinaryFile(filePath);
    const etag = await this.filesystem.getFileEtag(filePath);

    if (!file || !etag) {
      return null;
    }

    return { image: file, etag };
  }

  async getDescription() {
    const appRepoDir = this.appPaths.getAppRepoDir(this.appUrn);
    const descriptionPath = path.join(appRepoDir, 'metadata', 'description.md');

    if (await this.filesystem.pathExists(descriptionPath)) {
      return (await this.filesystem.readTextFile(descriptionPath)) ?? '';
    }

    return '';
  }

  async hasDataDir() {
    const appRepoDir = this.appPaths.getAppRepoDir(this.appUrn);
    return this.filesystem.pathExists(path.join(appRepoDir, 'data'));
  }
}
