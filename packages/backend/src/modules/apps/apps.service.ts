import { TranslatableError } from '@/common/error/translatable-error';
import { createAppUrn } from '@/common/helpers/app-helpers';
import { pLimit } from '@/common/helpers/file-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { AppFilesManager } from './app-files-manager';
import { AppsRepository } from './apps.repository';

type AppList = Awaited<ReturnType<AppsRepository['getApps']>>;

@Injectable()
export class AppsService {
  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly appFilesManager: AppFilesManager,
    private readonly logger: LoggerService,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  private async populateAppInfo(apps: AppList) {
    const limit = pLimit(10);

    const populatedApps = await Promise.all(
      apps.map(async (app) => {
        return limit(async () => {
          const appUrn = createAppUrn(app.appName, app.appStoreSlug);
          const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

          const updateInfo = await this.marketplaceService.getAppUpdateInfo(appUrn).catch((_) => {
            return { latestVersion: 0, latestDockerVersion: '0.0.0' };
          });

          if (!appInfo) {
            this.logger.debug(`App ${app.id} not found in app files`);
            return null;
          }

          const localSubdomain = app.localSubdomain || appUrn.split(':').join('-');
          return { app, info: appInfo, metadata: { ...updateInfo, localSubdomain } };
        });
      }),
    );

    return populatedApps.filter((app) => app !== null);
  }

  /**
   * Get the installed apps
   */
  public async getInstalledApps() {
    const apps = await this.appsRepository.getApps();

    return this.populateAppInfo(apps);
  }

  public async getGuestDashboardApps() {
    this.logger.debug('Getting guest dashboard apps');
    const apps = await this.appsRepository.getGuestDashboardApps();
    this.logger.debug(`Got ${apps.length} guest dashboard apps`);

    return this.populateAppInfo(apps);
  }

  public async getApp(appUrn: AppUrn) {
    const app = await this.appsRepository.getAppByUrn(appUrn);
    const updateInfo = await this.marketplaceService.getAppUpdateInfo(appUrn).catch((_) => {
      return { latestVersion: 0, latestDockerVersion: '0.0.0' };
    });

    let info = await this.appFilesManager.getInstalledAppInfo(appUrn);

    const userCompose = await this.appFilesManager.getUserComposeFile(appUrn);
    const userEnv = await this.appFilesManager.getUserEnv(appUrn);
    const hasCustomConfig = Boolean(userCompose.content) || Boolean(userEnv.content);

    if (!info) {
      info = await this.marketplaceService.getAppInfoFromAppStore(appUrn);
    }

    if (!info) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND');
    }

    const localSubdomain = app?.localSubdomain || appUrn.split(':').join('-');

    const metadata = {
      hasCustomConfig,
      localSubdomain,
      ...updateInfo,
    };

    return { app, info, metadata };
  }

  public async getRandomPort(tries = 3): Promise<number> {
    if (tries <= 0) {
      throw new Error('Failed to get random port after 3 tries');
    }

    const port = Math.floor(Math.random() * (65535 - 1025 + 1)) + 1025;
    const apps = await this.appsRepository.getAppsByPort(port);

    if (apps.length === 0) {
      return port;
    }

    return this.getRandomPort(tries - 1);
  }
}
