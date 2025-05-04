import { LoggerService } from '@/core/logger/logger.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class BackupAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    try {
      logger.info(`Stopping app ${appUrn}`);
      await dockerService.composeApp(appUrn, 'rm --force --stop').catch((err) => {
        logger.error(`Failed to stop app ${appUrn}: ${err.message}`);
      });

      await backupManager.backupApp(appUrn);

      // Done
      logger.info('Backup completed!');

      return { success: true, message: `App ${appUrn} backed up successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'backup');
    }
  }
}
