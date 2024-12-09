import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
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

  public async execute(appId: string, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    try {
      if (process.getuid && process.getgid) {
        this.logger.info(`Installing app ${appId} as User ID: ${process.getuid()}, Group ID: ${process.getgid()}`);
      } else {
        this.logger.info(`Installing app ${appId}. No User ID or Group ID found.`);
      }

      await this.marketplaceService.copyAppFromRepoToInstalled(appId);

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await this.appHelpers.generateEnvFile(appId, form);

      // Copy data dir
      const appEnv = await this.appFilesManager.getAppEnv(appId);
      const envMap = this.envUtils.envStringToMap(appEnv.content);

      this.logger.info(`Copying data dir for app ${appId}`);
      await this.marketplaceService.copyDataDir(appId, envMap);

      await this.ensureAppDir(appId, form);

      // run docker-compose up
      await this.dockerService.composeApp(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      return { success: true, message: `App ${appId} installed successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'install');
    }
  }
}
