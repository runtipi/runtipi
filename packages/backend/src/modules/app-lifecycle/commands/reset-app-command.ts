import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import type { EnvUtils } from '@/modules/env/env.utils';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class ResetAppCommand extends AppLifecycleCommand {
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
      this.logger.info(`Resetting app ${appUrn}`);

      await this.ensureAppDir(appUrn, form);
      await this.appHelpers.generateEnvFile(appUrn, form);

      // Stop app
      try {
        await this.dockerService.composeApp(appUrn, 'down --remove-orphans --volumes');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          this.logger.warn(`Could not reset app ${appUrn}. Most likely there have been made changes to the compose file.`);
        } else {
          throw err;
        }
      }

      // Delete app data directory
      await this.appFilesManager.deleteAppDataDir(appUrn);
      await this.appFilesManager.createAppDataDir(appUrn);

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appUrn}`);
      await this.appHelpers.generateEnvFile(appUrn, form);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appUrn}`);
      const env = await this.appFilesManager.getAppEnv(appUrn);
      const envMap = this.envUtils.envStringToMap(env.content);

      await this.marketplaceService.copyDataDir(appUrn, envMap);
      await this.ensureAppDir(appUrn, form);

      return { success: true, message: `App ${appUrn} reset successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'reset');
    }
  }
}
