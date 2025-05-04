import { LoggerService } from '@/core/logger/logger.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class RestoreAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    private readonly filename: string,
  ) {
    super(moduleRef);
  }

  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    try {
      // Stop the app
      logger.info(`Stopping app ${appUrn}`);
      await dockerService.composeApp(appUrn, 'rm --force --stop').catch((err) => {
        logger.error(`Failed to stop app ${appUrn}: ${err.message}`);
      });

      await backupManager.restoreApp(appUrn, this.filename);

      // Done
      logger.info(`App ${appUrn} restored!`);
      return { success: true, message: `App ${appUrn} restored successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'restore');
    }
  }
}
