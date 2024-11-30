import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerComposeBuilder } from '@/modules/docker/builders/compose.builder';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { AppLifecycleCommand } from './command';

export class StartAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    dockerComposeBuilder: DockerComposeBuilder,
    private readonly appHelpers: AppHelpers,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService, dockerComposeBuilder);

    this.logger = logger;
    this.appFilesManager = appFilesManager;
  }

  public async execute(appId: string, form: AppEventFormInput, skipEnvGeneration = false) {
    try {
      this.logger.info(`Starting app ${appId}`);

      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await this.appHelpers.generateEnvFile(appId, form);
      }

      await this.dockerService.composeApp(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appId} started`);

      return { success: true, message: `App ${appId} started successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'start');
    }
  }
}
