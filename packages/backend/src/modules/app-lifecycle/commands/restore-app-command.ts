import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppUrn } from '@/types/app/app.types';
import { AppLifecycleCommand } from './command';

export class RestoreAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly backupManager: BackupManager,
    private readonly filename: string,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);
  }

  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
    try {
      // Stop the app
      this.logger.info(`Stopping app ${appUrn}`);
      await this.dockerService.composeApp(appUrn, 'rm --force --stop').catch((err) => {
        this.logger.error(`Failed to stop app ${appUrn}: ${err.message}`);
      });

      await this.backupManager.restoreApp(appUrn, this.filename);

      // Done
      this.logger.info(`App ${appUrn} restored!`);
      return { success: true, message: `App ${appUrn} restored successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'restore');
    }
  }
}
