import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
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

  public async execute(appUrn: AppUrn, form: AppEventFormInput, skipEnvGeneration = false): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.appFilesManager.getInstalledAppInfo(appUrn);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      await this.ensureAppDir(appUrn, form);

      this.logger.info(`Stopping app ${appUrn}`);

      await this.dockerService.composeApp(appUrn, 'rm --force --stop').catch((err) => {
        this.logger.error(`Failed to stop app ${appUrn}: ${err.message}`);
      });
      await this.ensureAppDir(appUrn, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appUrn}`);
        await this.appHelpers.generateEnvFile(appUrn, form);
      }

      await this.dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appUrn} restarted`);

      return { success: true, message: `App ${appUrn} restarted successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'restart');
    }
  }
}
