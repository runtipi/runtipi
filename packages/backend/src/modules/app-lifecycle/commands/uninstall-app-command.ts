import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { AppLifecycleCommand } from './command';

export class UninstallAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly removeBackups: boolean = false,
  ) {
    super(moduleRef, docker);
  }

  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    try {
      if (this.removeBackups) {
        await backupManager.deleteAppBackupsByUrn(appUrn);
      }
      logger.info(`Uninstalling app ${appUrn}`);

      try {
        await dockerService.composeApp(appUrn, 'down --remove-orphans -v --rmi all');
        logger.info(`Successfully cleaned up all Docker resources for ${appUrn}`);
      } catch (err) {
        logger.warn('Error taking down app', appUrn, err);
      }

      await appFilesManager.deleteAppFolder(appUrn);
      await appFilesManager.deleteAppDataDir(appUrn);

      return { success: true, message: `App ${appUrn} uninstalled successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'uninstall');
    }
  }
}
