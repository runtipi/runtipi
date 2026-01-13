import { LoggerService } from '@/core/logger/logger.service';
import { DockerService } from '@/modules/docker/docker.service';
import { AppInstallationService } from '@/modules/app-lifecycle/services/app-installation.service';
import { AppSourceFactory } from '@/modules/apps/sources/app-source.factory';
import { BackupManager } from '@/modules/backups/backup.manager';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';
import type Dockerode from 'dockerode';
import type { ModuleRef } from '@nestjs/core';

export class UpdateAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly performBackup: boolean = true,
  ) {
    super(moduleRef, docker);
  }

  public async execute(appUrn: AppUrn, form: AppEventFormInput) {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });
    const installationService = this.moduleRef.get(AppInstallationService, { strict: false });
    const appSourceFactory = this.moduleRef.get(AppSourceFactory, { strict: false });

    // Validate if app is still available in source
    const source = appSourceFactory.getSource(appUrn);
    const compose = await source.getCompose();

    if (!compose) {
      return this.handleAppError(`App source or compose not available for ${appUrn}. Cannot update.`, appUrn, 'update_error');
    }

    try {
      if (this.performBackup) {
        await dockerService.composeApp(appUrn, 'stop');
        await backupManager.backupApp(appUrn).catch((err) => {
          logger.error(`Backup failed for ${appUrn} before update: ${err.message}`);
          throw err;
        });
      }

      logger.info(`Updating app ${appUrn}`);

      // Use the harmonized installation service to prepare everything
      await installationService.prepareInstallation(appUrn, form);

      try {
        await dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans');
        await dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (_) {
        logger.warn(`App ${appUrn} has likely a broken compose file. Continuing with update...`);
      }

      await dockerService.composeApp(appUrn, 'pull');

      return { success: true, message: `App ${appUrn} updated successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'update_error');
    }
  }
}
