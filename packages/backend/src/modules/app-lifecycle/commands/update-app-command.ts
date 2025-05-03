import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
import { AppLifecycleCommand } from './command';
import type { ModuleRef } from '@nestjs/core';

export class UpdateAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    private readonly performBackup: boolean = true,
  ) {
    super(moduleRef);
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput) {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const marketplaceService = this.moduleRef.get(MarketplaceService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    try {
      if (this.performBackup) {
        await backupManager.backupApp(appUrn);
      }

      logger.info(`Updating app ${appUrn}`);
      await this.ensureAppDir(appUrn, form);
      await appHelpers.generateEnvFile(appUrn, form);

      try {
        await dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans');
        await dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (err) {
        logger.warn(`App ${appUrn} has likely a broken docker-compose.yml file. Continuing with update...`);
      }

      await appFilesManager.deleteAppFolder(appUrn);
      await marketplaceService.copyAppFromRepoToInstalled(appUrn);

      await this.ensureAppDir(appUrn, form);

      await dockerService.composeApp(appUrn, 'pull');

      return { success: true, message: `App ${appUrn} updated successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'update_error');
    }
  }
}
