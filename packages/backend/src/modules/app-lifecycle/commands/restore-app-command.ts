import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { AppLifecycleCommand } from './command';

export class RestoreAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    private readonly backupManager: BackupManager,
    private readonly filename: string,
  ) {
    super(logger, appFilesManager, dockerService);

    this.logger = logger;
    this.appFilesManager = appFilesManager;
  }

  public async execute(appId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Stop the app
      this.logger.info(`Stopping app ${appId}`);
      await this.dockerService.composeApp(appId, 'rm --force --stop').catch((err) => {
        this.logger.error(`Failed to stop app ${appId}: ${err.message}`);
      });

      await this.backupManager.restoreApp(appId, this.filename);

      // Done
      this.logger.info(`App ${appId} restored!`);
      return { success: true, message: `App ${appId} restored successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'restore');
    }
  }
}
