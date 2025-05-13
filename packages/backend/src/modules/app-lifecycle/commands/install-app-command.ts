import { LoggerService } from '@/core/logger/logger.service.js';
import { AppFilesManager } from '@/modules/apps/app-files-manager.js';
import { AppHelpers } from '@/modules/apps/app.helpers.js';
import { DockerService } from '@/modules/docker/docker.service.js';
import { EnvUtils } from '@/modules/env/env.utils.js';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service.js';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events.js';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command.js';

export class InstallAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const marketplaceService = this.moduleRef.get(MarketplaceService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });
    const envUtils = this.moduleRef.get(EnvUtils, { strict: false });

    try {
      if (process.getuid && process.getgid) {
        logger.info(`Installing app ${appUrn} as User ID: ${process.getuid()}, Group ID: ${process.getgid()}`);
      } else {
        logger.info(`Installing app ${appUrn}. No User ID or Group ID found.`);
      }

      await marketplaceService.copyAppFromRepoToInstalled(appUrn);

      // Create app.env file
      logger.info(`Creating app.env file for app ${appUrn}`);
      await appHelpers.generateEnvFile(appUrn, form);

      // Copy data dir
      const appEnv = await appFilesManager.getAppEnv(appUrn);
      const envMap = envUtils.envStringToMap(appEnv.content);

      logger.info(`Copying data dir for app ${appUrn}`);
      await marketplaceService.copyDataDir(appUrn, envMap);

      await this.ensureAppDir(appUrn, form);

      try {
        await dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (err) {
        logger.warn(`No prior containers to remove for app ${appUrn}`);
      }

      const config = await appFilesManager.getInstalledAppInfo(appUrn);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      // run docker-compose up
      const forcePull = config.force_pull ?? false;
      await dockerService.composeApp(appUrn, `up --detach --force-recreate --remove-orphans ${forcePull ? '--pull always' : ''}`);

      return { success: true, message: `App ${appUrn} installed successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'install');
    }
  }
}
