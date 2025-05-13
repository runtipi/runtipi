import { LoggerService } from '@/core/logger/logger.service.js';
import { AppFilesManager } from '@/modules/apps/app-files-manager.js';
import { AppHelpers } from '@/modules/apps/app.helpers.js';
import { DockerService } from '@/modules/docker/docker.service.js';
import { EnvUtils } from '@/modules/env/env.utils.js';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service.js';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events.js';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command.js';

export class ResetAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const marketplaceService = this.moduleRef.get(MarketplaceService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });
    const envUtils = this.moduleRef.get(EnvUtils, { strict: false });

    try {
      logger.info(`Resetting app ${appUrn}`);

      await this.ensureAppDir(appUrn, form);
      await appHelpers.generateEnvFile(appUrn, form);

      // Stop app
      try {
        await dockerService.composeApp(appUrn, 'down --remove-orphans --volumes');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          logger.warn(`Could not reset app ${appUrn}. Most likely there have been made changes to the compose file.`);
        } else {
          throw err;
        }
      }

      // Delete app data directory
      await appFilesManager.deleteAppDataDir(appUrn);
      await appFilesManager.createAppDataDir(appUrn);

      // Create app.env file
      logger.info(`Creating app.env file for app ${appUrn}`);
      await appHelpers.generateEnvFile(appUrn, form);

      // Copy data dir
      logger.info(`Copying data dir for app ${appUrn}`);
      const env = await appFilesManager.getAppEnv(appUrn);
      const envMap = envUtils.envStringToMap(env.content);

      await marketplaceService.copyDataDir(appUrn, envMap);
      await this.ensureAppDir(appUrn, form);

      return { success: true, message: `App ${appUrn} reset successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'reset');
    }
  }
}
