import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { AppLifecycleCommand } from './command';

export class BackupAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly backupManager: BackupManager,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);

    this.logger = logger;
    this.appFilesManager = appFilesManager;
  }

  public async execute(appId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info(`Stopping app ${appId}`);
      await this.dockerService.composeApp(appId, 'rm --force --stop').catch((err) => {
        this.logger.error(`Failed to stop app ${appId}: ${err.message}`);
      });

      await this.backupManager.backupApp(appId);

      // Done
      this.logger.info('Backup completed!');

      return { success: true, message: `App ${appId} backed up successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'backup');
    }
  }
}
