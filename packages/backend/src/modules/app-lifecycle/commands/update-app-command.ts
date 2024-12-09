import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppHelpers } from '@/modules/apps/app.helpers';
import type { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { AppLifecycleCommand } from './command';

export class UpdateAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    marketplaceService: MarketplaceService,
    private readonly appHelpers: AppHelpers,
    private readonly backupManager: BackupManager,
    private readonly performBackup: boolean = true,
  ) {
    super(logger, appFilesManager, dockerService, marketplaceService);
  }

  public async execute(appId: string, form: AppEventFormInput) {
    try {
      if (this.performBackup) {
        await this.backupManager.backupApp(appId);
      }

      this.logger.info(`Updating app ${appId}`);
      await this.ensureAppDir(appId, form);
      await this.appHelpers.generateEnvFile(appId, form);

      try {
        await this.dockerService.composeApp(appId, 'up --detach --force-recreate --remove-orphans');
        await this.dockerService.composeApp(appId, 'down --rmi all --remove-orphans');
      } catch (err) {
        this.logger.warn(`App ${appId} has likely a broken docker-compose.yml file. Continuing with update...`);
      }

      await this.appFilesManager.deleteAppFolder(appId);
      await this.marketplaceService.copyAppFromRepoToInstalled(appId);

      await this.ensureAppDir(appId, form);

      await this.dockerService.composeApp(appId, 'pull');

      return { success: true, message: `App ${appId} updated successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'update_error');
    }
  }
}
