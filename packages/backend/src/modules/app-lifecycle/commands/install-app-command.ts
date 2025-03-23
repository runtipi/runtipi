import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
import { AppLifecycleCommand } from './command';

export class InstallAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly appHelpers: AppHelpers,
    private readonly envUtils: EnvUtils,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    try {
      if (process.getuid && process.getgid) {
        this.logger.info(`Installing app ${appUrn} as User ID: ${process.getuid()}, Group ID: ${process.getgid()}`);
      } else {
        this.logger.info(`Installing app ${appUrn}. No User ID or Group ID found.`);
      }

      await this.marketplaceService.copyAppFromRepoToInstalled(appUrn);

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appUrn}`);
      await this.appHelpers.generateEnvFile(appUrn, form);

      // Copy data dir
      const appEnv = await this.appFilesManager.getAppEnv(appUrn);
      const envMap = this.envUtils.envStringToMap(appEnv.content);

      this.logger.info(`Copying data dir for app ${appUrn}`);
      await this.marketplaceService.copyDataDir(appUrn, envMap);

      await this.ensureAppDir(appUrn, form);

      try {
        await this.dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (err) {
        this.logger.warn(`No prior containers to remove for app ${appUrn}`);
      }

      const config = await this.appFilesManager.getInstalledAppInfo(appUrn);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      // run docker-compose up
      const forcePull = config.force_pull ?? false;
      await this.dockerService.composeApp(appUrn, `up --detach --force-recreate --remove-orphans ${forcePull ? '--pull always' : ''}`);

      return { success: true, message: `App ${appUrn} installed successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'install');
    }
  }
}
