import path from 'node:path';
import { APP_REL_COMPOSE_FILENAME } from '@/common/constants';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { appInfoSchema, dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import type { AppSource } from './app-source.interface';
import { AppPathsService } from '../app-paths.service';

export class CustomAppSource implements AppSource {
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
    const appInstalledDir = this.appPaths.getAppInstalledDir(this.appUrn);
    const configPath = path.join(appInstalledDir, 'config.json');

    try {
      if (await this.filesystem.pathExists(configPath)) {
        const configFile = await this.filesystem.readTextFile(configPath);
        const config = JSON.parse(configFile ?? '{}');
        const parsedConfig = appInfoSchema({ ...config, urn: this.appUrn });

        if (parsedConfig instanceof type.errors) {
          this.logger.error(`Custom app ${this.appUrn} config error: ${parsedConfig.summary}`);
          return null;
        }

        return parsedConfig;
      }
    } catch (error) {
      this.logger.error(`Error getting custom app info for ${this.appUrn}:`, error);
    }
    return null;
  }

  async getCompose() {
    const appInstalledDir = this.appPaths.getAppInstalledDir(this.appUrn);
    const appYamlPath = path.join(appInstalledDir, APP_REL_COMPOSE_FILENAME);

    try {
      if (await this.filesystem.pathExists(appYamlPath)) {
        const content = await this.filesystem.readYamlFile(appYamlPath);
        if (content && typeof content === 'object') {
          const parsed = dynamicComposeSchemaYaml(content);
          return parsed instanceof type.errors ? null : parsed;
        }
      }
    } catch (error) {
      this.logger.error(`Error getting ${APP_REL_COMPOSE_FILENAME} for custom app ${this.appUrn}:`, error);
    }

    return null;
  }

  async getLogo() {
    const { appDir } = this.configuration.get('directories');
    const filePath = path.join(appDir, 'assets', 'default-app-logo.jpg');

    const file = await this.filesystem.readBinaryFile(filePath);
    const etag = await this.filesystem.getFileEtag(filePath);

    if (!file || !etag) {
      return null;
    }

    return { image: file, etag };
  }

  async getDescription() {
    const info = await this.getAppInfo();
    return info?.description ?? '';
  }

  async hasDataDir() {
    return false; // Custom apps don't have a template data dir in repo
  }
}
