import { TranslatableError } from '@/common/error/translatable-error';
import { pLimit } from '@/common/helpers/file-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
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
          const appInfo = await this.appFilesManager.getInstalledAppInfo(app.id);

          const updateInfo = await this.marketplaceService.getAppUpdateInfo(app.id).catch((_) => {
            return { latestVersion: 0, latestDockerVersion: '0.0.0' };
          });
          if (!appInfo) {
            return null;
          }
          return { app, info: appInfo, updateInfo };
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

  public async getApp(id: string) {
    const app = await this.appsRepository.getApp(id);
    const updateInfo = await this.marketplaceService.getAppUpdateInfo(id).catch((_) => {
      return { latestVersion: 0, latestDockerVersion: '0.0.0' };
    });

    let info = await this.appFilesManager.getInstalledAppInfo(id);

    if (!info) {
      info = await this.marketplaceService.getAppInfoFromAppStore(id);
    }

    if (!info) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND');
    }

    return { app, info, updateInfo };
  }
}
