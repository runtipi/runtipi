import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import type { AppUrn } from '@runtipi/common/types';
import { AppPathsService } from '../app-paths.service';
import type { AppSource } from './app-source.interface';
import { StoreAppSource } from './store-app-source';
import { CustomAppSource } from './custom-app-source';
import { InstalledAppSource } from './installed-app-source';

@Injectable()
export class AppSourceFactory {
  constructor(
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private readonly configuration: ConfigurationService,
    private readonly appPaths: AppPathsService,
  ) {}

  public getSource(appUrn: AppUrn): AppSource {
    const { appStoreId } = extractAppUrn(appUrn);

    if (appStoreId === '_user') {
      return new CustomAppSource(appUrn, this.filesystem, this.logger, this.configuration, this.appPaths);
    }

    return new StoreAppSource(appUrn, this.filesystem, this.logger, this.configuration, this.appPaths);
  }

  public getInstalledSource(appUrn: AppUrn): AppSource {
    return new InstalledAppSource(appUrn, this.filesystem, this.logger, this.configuration, this.appPaths);
  }
}
