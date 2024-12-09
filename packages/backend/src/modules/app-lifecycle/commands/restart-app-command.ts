import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { AppLifecycleCommand } from './command';

export class RestartAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly appHelpers: AppHelpers,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);
  }

  public async execute(appId: string, form: AppEventFormInput, skipEnvGeneration = false): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.appFilesManager.getInstalledAppInfo(appId);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      await this.ensureAppDir(appId, form);

      this.logger.info(`Stopping app ${appId}`);

      await this.dockerService.composeApp(appId, 'rm --force --stop').catch((err) => {
        this.logger.error(`Failed to stop app ${appId}: ${err.message}`);
      });
      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await this.appHelpers.generateEnvFile(appId, form);
      }

      await this.dockerService.composeApp(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appId} restarted`);

      return { success: true, message: `App ${appId} restarted successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'restart');
    }
  }
}
