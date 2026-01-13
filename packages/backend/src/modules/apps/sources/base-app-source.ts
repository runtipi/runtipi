import path from 'node:path';
import { APP_REL_COMPOSE_FILENAME } from '@/common/constants';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { appInfoSchema, convertLegacyToYaml, dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import { AppPathsService } from '../app-paths.service';

export abstract class BaseAppSource {
  constructor(
    protected readonly appUrn: AppUrn,
    protected readonly filesystem: FilesystemService,
    protected readonly logger: LoggerService,
    protected readonly configuration: ConfigurationService,
    protected readonly appPaths: AppPathsService,
  ) {}

  getAppUrn() {
    return this.appUrn;
  }

  protected abstract getBaseDir(): string;

  async getAppInfo() {
    const baseDir = this.getBaseDir();
    const configPath = this.appPaths.getAppConfigPath(baseDir);

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
    const baseDir = this.getBaseDir();
    const appYamlPath = this.appPaths.getAppComposePath(baseDir);

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
    const dockerComposeLegacyPath = this.appPaths.getAppLegacyComposePath(baseDir);

    try {
      if (await this.filesystem.pathExists(dockerComposeLegacyPath)) {
        content = await this.filesystem.readJsonFile(dockerComposeLegacyPath);
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
    const baseDir = this.getBaseDir();
    const { appDir } = this.configuration.get('directories');

    const appLogoPath = this.appPaths.getAppLogoPath(baseDir);
    let filePath = path.join(appDir, 'assets', 'default-app-logo.jpg');

    if (await this.filesystem.pathExists(appLogoPath)) {
      filePath = appLogoPath;
    }

    const file = await this.filesystem.readBinaryFile(filePath);
    const etag = await this.filesystem.getFileEtag(filePath);

    if (!file || !etag) {
      return null;
    }

    return { image: file, etag };
  }

  async getDescription() {
    const baseDir = this.getBaseDir();
    const descriptionPath = this.appPaths.getAppDescriptionPath(baseDir);

    if (await this.filesystem.pathExists(descriptionPath)) {
      return (await this.filesystem.readTextFile(descriptionPath)) ?? '';
    }

    return '';
  }

  async hasDataDir() {
    const baseDir = this.getBaseDir();
    return this.filesystem.pathExists(this.appPaths.getAppDataTemplateDir(baseDir));
  }
}
