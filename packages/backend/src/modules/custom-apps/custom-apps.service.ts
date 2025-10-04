import { TranslatableError } from '@/common/error/translatable-error';
import { createAppUrn, extractAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import path from 'node:path';
import { AppsRepository } from '../apps/apps.repository';
import type { CreateCustomAppDto, UpdateCustomAppDto } from './dto/custom-apps.dto';

const APPS_FOLDER = '_user';

@Injectable()
export class CustomAppService {
  constructor(
    private readonly logger: LoggerService,
    private readonly filesystem: FilesystemService,
    private readonly configService: ConfigurationService,
    private readonly appsRepository: AppsRepository,
  ) {}

  async createCustomApp(dto: CreateCustomAppDto): Promise<{ appUrn: AppUrn; appName: string; storeId: string }> {
    const { name, config } = dto;

    const appUrn = createAppUrn(name, APPS_FOLDER);

    const existingApp = await this.appsRepository.getAppByUrn(appUrn);
    if (existingApp) {
      throw new TranslatableError('CUSTOM_APP_ERROR_DUPLICATE_NAME', { name }, HttpStatus.CONFLICT);
    }

    try {
      await this.createAppDirectories(appUrn);
      await this.writeDockerComposeConfig(appUrn, config);
      await this.createAppInfo(appUrn, name, config);

      await this.appsRepository.createApp({
        appStoreSlug: APPS_FOLDER,
        appName: name,
        config: {},
        status: 'missing',
      });

      this.logger.info(`Custom app ${name} created successfully with URN ${appUrn}`);

      return {
        appUrn,
        appName: name,
        storeId: APPS_FOLDER,
      };
    } catch (error) {
      this.logger.error(`Failed to create custom app ${name}:`, error);
      await this.cleanupAppDirectories(appUrn).catch(() => {
        // Noop
      });
      console.error(error);
      throw new TranslatableError('CUSTOM_APP_ERROR_CREATION_FAILED', { name }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateCustomApp(appUrn: AppUrn, config: UpdateCustomAppDto['config']) {
    const existingApp = await this.appsRepository.getAppByUrn(appUrn);
    if (!existingApp) {
      throw new TranslatableError('CUSTOM_APP_ERROR_NOT_FOUND', { urn: appUrn }, HttpStatus.NOT_FOUND);
    }

    try {
      await this.writeDockerComposeConfig(appUrn, config);
      this.logger.info(`Custom app ${appUrn} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update custom app ${appUrn}:`, error);
      throw new TranslatableError('CUSTOM_APP_ERROR_UPDATE_FAILED', { urn: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async createAppDirectories(appUrn: AppUrn): Promise<void> {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const { dataDir } = this.configService.get('directories');

    const appPath = path.join(dataDir, 'apps', appStoreId, appName);
    const dataPath = path.join(dataDir, 'app-data', appStoreId, appName);

    const ok = await this.filesystem.createDirectories([appPath, dataPath]);
    if (!ok) {
      throw new Error(`Failed to create app directories at ${appPath} and ${dataPath}`);
    }
  }

  private async writeDockerComposeConfig(appUrn: AppUrn, config: CreateCustomAppDto['config']): Promise<void> {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const { dataDir } = this.configService.get('directories');

    const configPath = path.join(dataDir, 'apps', appStoreId, appName, 'docker-compose.json');
    const configContent = JSON.stringify(config, null, 2);

    const ok = await this.filesystem.writeTextFile(configPath, configContent);
    if (!ok) {
      throw new Error(`Failed to write docker-compose config at ${configPath}`);
    }
  }

  private async createAppInfo(appUrn: AppUrn, name: string, config: CreateCustomAppDto['config']): Promise<void> {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const { dataDir } = this.configService.get('directories');

    const infoPath = path.join(dataDir, 'apps', appStoreId, appName, 'config.json');

    const main = config.services.find((s) => s.isMain) ?? config.services[0];
    const inferredPort = main?.internalPort ?? 80;

    // Create a minimal app.info file for custom apps
    const appInfo = {
      id: appName,
      name: name,
      urn: appUrn,
      available: true,
      port: inferredPort,
      categories: ['utilities'],
      description: `Custom application: ${name}`,
      short_desc: 'User-created custom app',
      author: 'User',
      source: '',
      website: '',
      exposable: true,
      no_gui: false,
      supported_architectures: ['amd64', 'arm64'],
      tipi_version: 1,
      version: '1.0.0',
      dynamic_config: true,
    };

    const ok = await this.filesystem.writeJsonFile(infoPath, appInfo);
    if (!ok) {
      throw new Error(`Failed to write app info at ${infoPath}`);
    }
  }

  async uploadAppImage(appUrn: AppUrn, imageBuffer: Buffer): Promise<void> {
    const { appName, appStoreId } = extractAppUrn(appUrn);

    if (appStoreId !== APPS_FOLDER) {
      throw new TranslatableError('CUSTOM_APP_ERROR_NOT_CUSTOM', { urn: appUrn }, HttpStatus.BAD_REQUEST);
    }

    const existingApp = await this.appsRepository.getAppByUrn(appUrn);
    if (!existingApp) {
      throw new TranslatableError('CUSTOM_APP_ERROR_NOT_FOUND', { urn: appUrn }, HttpStatus.NOT_FOUND);
    }

    try {
      const { dataDir } = this.configService.get('directories');
      const metadataDir = path.join(dataDir, 'apps', appStoreId, appName, 'metadata');
      const logoPath = path.join(metadataDir, 'logo.jpg');

      await this.filesystem.createDirectory(metadataDir);

      const ok = await this.filesystem.writeBinaryFile(logoPath, imageBuffer);
      if (!ok) {
        throw new Error(`Failed to write logo at ${logoPath}`);
      }

      this.logger.info(`Custom app ${appUrn} logo uploaded successfully`);
    } catch (error) {
      this.logger.error(`Failed to upload logo for custom app ${appUrn}:`, error);
      throw new TranslatableError('CUSTOM_APP_ERROR_UPLOAD_FAILED', { urn: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async cleanupAppDirectories(appUrn: AppUrn): Promise<void> {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const { dataDir } = this.configService.get('directories');

    const appPath = path.join(dataDir, 'apps', appStoreId, appName);
    const dataPath = path.join(dataDir, 'app-data', appStoreId, appName);

    await Promise.all([this.filesystem.removeDirectory(appPath), this.filesystem.removeDirectory(dataPath)]);
  }
}
