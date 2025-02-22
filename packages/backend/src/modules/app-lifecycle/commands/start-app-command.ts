import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
import { AppLifecycleCommand } from './command';

export class StartAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly appHelpers: AppHelpers,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);

    this.logger = logger;
    this.appFilesManager = appFilesManager;
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput, skipEnvGeneration = false) {
    try {
      this.logger.info(`Starting app ${appUrn}`);

      await this.ensureAppDir(appUrn, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appUrn}`);
        await this.appHelpers.generateEnvFile(appUrn, form);
      }

      const forcePull = await this.marketplaceService.getAppInfoFromAppStore(appUrn);

      await this.dockerService.composeApp(appUrn, `up --detach --force-recreate --remove-orphans ${forcePull && '--pull always'}`);

      this.logger.info(`App ${appUrn} started`);

      return { success: true, message: `App ${appUrn} started successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'start');
    }
  }
}
