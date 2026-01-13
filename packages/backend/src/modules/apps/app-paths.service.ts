import path from 'node:path';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';

@Injectable()
export class AppPathsService {
  constructor(private readonly configuration: ConfigurationService) {}

  public getInstalledAppsFolder() {
    const { directories } = this.configuration.getConfig();
    return path.join(directories.dataDir, 'apps');
  }

  public getAppStoreFolder(storeSlug: string) {
    const { directories } = this.configuration.getConfig();
    return path.join(directories.dataDir, 'repos', storeSlug, 'apps');
  }

  public getAppPaths(appUrn: AppUrn) {
    const { appStoreId, appName } = extractAppUrn(appUrn);
    const { directories } = this.configuration.getConfig();

    return {
      appDataDir: path.join(directories.appDataDir, appStoreId, appName),
      appRepoDir: path.join(this.getAppStoreFolder(appStoreId), appName),
      appInstalledDir: path.join(this.getInstalledAppsFolder(), appStoreId, appName),
    };
  }

  public getAppDataDir(appUrn: AppUrn) {
    return this.getAppPaths(appUrn).appDataDir;
  }

  public getAppRepoDir(appUrn: AppUrn) {
    return this.getAppPaths(appUrn).appRepoDir;
  }

  public getAppInstalledDir(appUrn: AppUrn) {
    return this.getAppPaths(appUrn).appInstalledDir;
  }

  public getAppUserConfigDir(appUrn: AppUrn) {
    const { appStoreId, appName } = extractAppUrn(appUrn);
    const { directories } = this.configuration.getConfig();
    return path.join(directories.dataDir, 'user-config', appStoreId, appName);
  }
}
