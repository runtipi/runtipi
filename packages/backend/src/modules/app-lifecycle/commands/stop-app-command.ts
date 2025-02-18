import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
import { AppLifecycleCommand } from './command';

export class StopAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly appHelpers: AppHelpers,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput, skipEnvGeneration = false) {
    try {
      const config = await this.appFilesManager.getInstalledAppInfo(appUrn);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      this.logger.info(`Stopping app ${appUrn}`);

      await this.ensureAppDir(appUrn, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appUrn}`);
        await this.appHelpers.generateEnvFile(appUrn, form);
      }

      await this.dockerService.composeApp(appUrn, 'rm --force --stop');
      this.logger.info(`App ${appUrn} stopped`);

      return { success: true, message: `App ${appUrn} stopped successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'stop');
    }
  }
}
