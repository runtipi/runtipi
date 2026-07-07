import { APP_REL_COMPOSE_FILENAME } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import path from 'node:path';
import * as yaml from 'yaml';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { MarketplaceService } from '../marketplace/marketplace.service';
import type { UpdateAppConfigDto } from './dto/app-config.dto';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly logger: LoggerService,
    private readonly filesystem: FilesystemService,
    private readonly configService: ConfigurationService,
    private readonly appsRepository: AppsRepository,
    private readonly marketplaceService: MarketplaceService,
    private readonly appFilesManager: AppFilesManager,
  ) {}

  private getConfigPath(appUrn: AppUrn) {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const { dataDir } = this.configService.get('directories');
    return path.join(dataDir, 'apps', appStoreId, appName, APP_REL_COMPOSE_FILENAME);
  }

  async updateAppConfig(appUrn: AppUrn, dto: UpdateAppConfigDto) {
    if (this.configService.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const existingApp = await this.appsRepository.getAppByUrn(appUrn);
    if (!existingApp) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const configPath = this.getConfigPath(appUrn);

    try {
      yaml.parse(dto.config);
    } catch (error) {
      this.logger.error(`Failed to parse YAML config for app ${appUrn}:`, error);
      throw new TranslatableError('APP_ERROR_INVALID_CONFIG', { id: appUrn }, HttpStatus.BAD_REQUEST);
    }

    try {
      const ok = await this.filesystem.writeTextFile(configPath, dto.config);
      if (!ok) {
        throw new Error(`Failed to write config at ${configPath}`);
      }

      this.logger.info(`App ${appUrn} config updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to save config for app ${appUrn}:`, error);
      throw new TranslatableError('APP_ERROR_SAVE_CONFIG', { id: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAppConfig(appUrn: AppUrn) {
    try {
      const { content } = await this.appFilesManager.getSourceDockerComposeYaml(appUrn);
      if (!content) {
        return null;
      }
      return JSON.stringify(content, null, 2);
    } catch (error) {
      this.logger.error(`Failed to get config for ${appUrn}:`, error);
      return null;
    }
  }

  async getTemplateDiff(appUrn: AppUrn) {
    const app = await this.appsRepository.getAppByUrn(appUrn);
    const resolvedTemplateUrn = app?.templateUrn ?? (app?.appStoreSlug !== '_user' ? appUrn : null);

    if (!app || !resolvedTemplateUrn) {
      return {
        hasChanges: false,
        localVersion: 0,
        templateVersion: 0,
        current: undefined,
        template: undefined,
      };
    }

    const localResult = await this.appFilesManager.getSourceDockerComposeYaml(appUrn);
    const templateConfig = await this.marketplaceService.getSourceDockerComposeYaml(resolvedTemplateUrn as AppUrn);

    if (!templateConfig.content) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const localContentStr = localResult.content ? yaml.stringify(localResult.content, { nullStr: '' }) : '';
    const templateContentStr =
      typeof templateConfig.content === 'string'
        ? yaml.stringify(yaml.parse(templateConfig.content), { nullStr: '' })
        : yaml.stringify(templateConfig.content, { nullStr: '' });

    const hasChanges = localContentStr !== templateContentStr;

    let templateVersion = 1;
    if (templateConfig.content && typeof templateConfig.content === 'object' && 'x-runtipi' in templateConfig.content) {
      const xRuntipi = templateConfig.content['x-runtipi'] as { schema_version?: number };
      templateVersion = xRuntipi.schema_version || 1;
    }

    return {
      hasChanges,
      localVersion: app.templateVersion || 0,
      templateVersion,
      current: hasChanges ? localContentStr : undefined,
      template: hasChanges ? templateContentStr : undefined,
    };
  }

  async syncWithTemplate(appUrn: AppUrn) {
    if (this.configService.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const app = await this.appsRepository.getAppByUrn(appUrn);
    const resolvedTemplateUrn = app?.templateUrn ?? (app?.appStoreSlug !== '_user' ? appUrn : null);

    if (!app || !resolvedTemplateUrn) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    const templateConfig = await this.marketplaceService.getSourceDockerComposeYaml(resolvedTemplateUrn as AppUrn);
    if (!templateConfig.content) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.backupConfig(appUrn);

    const templateContentStr =
      typeof templateConfig.content === 'string' ? templateConfig.content : yaml.stringify(templateConfig.content, { nullStr: '' });

    await this.updateAppConfig(appUrn, { config: templateContentStr });

    let templateVersion = 1;
    if (templateConfig.content && typeof templateConfig.content === 'object' && 'x-runtipi' in templateConfig.content) {
      const xRuntipi = templateConfig.content['x-runtipi'] as { schema_version?: number };
      templateVersion = xRuntipi.schema_version || 1;
    }

    await this.appsRepository.updateAppById(app.id, {
      lastTemplateSyncAt: Math.floor(Date.now() / 1000),
      templateVersion,
    });

    this.logger.info(`App ${appUrn} synced with template successfully`);
  }

  private async backupConfig(appUrn: AppUrn) {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const { dataDir } = this.configService.get('directories');
    const configPath = this.getConfigPath(appUrn);
    const backupPath = path.join(dataDir, 'apps', appStoreId, appName, `docker-compose.yml.backup.${Date.now()}`);

    const content = await this.filesystem.readTextFile(configPath);
    if (content) {
      await this.filesystem.writeTextFile(backupPath, content);
    } else {
      this.logger.warn(`No config found for ${appUrn}, skipping backup`);
    }
  }
}
