import type { LoggerService } from '@/core/logger/logger.service';
import type { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppHelpers } from '@/modules/apps/app.helpers';
import type { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class GenerateAppEnvCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly appHelpers: AppHelpers,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info(`Regenerating app.env file for app ${appUrn}`);
      await this.ensureAppDir(appUrn, form);
      await this.appHelpers.generateEnvFile(appUrn, form);

      return { success: true, message: `App ${appUrn} env file regenerated successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'generate_env_error');
    }
  }
}
