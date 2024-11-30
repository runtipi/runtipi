import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerComposeBuilder } from '@/modules/docker/builders/compose.builder';
import type { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { AppLifecycleCommand } from './command';

export class GenerateAppEnvCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    dockerComposeBuilder: DockerComposeBuilder,
    private readonly appHelpers: AppHelpers,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService, dockerComposeBuilder);
  }

  public async execute(appId: string, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId, form);
      await this.appHelpers.generateEnvFile(appId, form);

      return { success: true, message: `App ${appId} env file regenerated successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'generate_env_error');
    }
  }
}
