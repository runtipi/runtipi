import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppHelpers } from '@/modules/apps/app.helpers';
import type { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
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

  public async execute(appUrn: AppUrn, form: AppEventFormInput) {
    try {
      if (this.performBackup) {
        await this.backupManager.backupApp(appUrn);
      }

      this.logger.info(`Updating app ${appUrn}`);
      await this.ensureAppDir(appUrn, form);
      await this.appHelpers.generateEnvFile(appUrn, form);

      try {
        await this.dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans');
        await this.dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (err) {
        this.logger.warn(`App ${appUrn} has likely a broken docker-compose.yml file. Continuing with update...`);
      }

      await this.appFilesManager.deleteAppFolder(appUrn);
      await this.marketplaceService.copyAppFromRepoToInstalled(appUrn);

      await this.ensureAppDir(appUrn, form);

      await this.dockerService.composeApp(appUrn, 'pull');

      return { success: true, message: `App ${appUrn} updated successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'update_error');
    }
  }
}
