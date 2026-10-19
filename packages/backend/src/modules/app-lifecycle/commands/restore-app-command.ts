import { LoggerService } from '@/core/logger/logger.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { AppLifecycleCommand } from './command';

export class RestoreAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly filename: string,
  ) {
    super(moduleRef, docker);
  }

  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string; appStopped: boolean }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    let appStopped = false;

    try {
      // Stop the app
      logger.info(`Stopping app ${appUrn} for restore operation`);
      await dockerService.composeApp(appUrn, 'stop');
      appStopped = true;

      await backupManager.restoreApp(appUrn, this.filename);

      // Done
      logger.info(`App ${appUrn} restored!`);
      return { success: true, message: `App ${appUrn} restored successfully`, appStopped };
    } catch (err) {
      const errorResult = await this.handleAppError(err, appUrn, 'restore');
      return { ...errorResult, appStopped };
    }
  }
}
