import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class BackupAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });
    const appsRepository = this.moduleRef.get(AppsRepository, { strict: false });
    const config = this.moduleRef.get(ConfigurationService, { strict: false });

    try {
      logger.info(`Stopping app ${appUrn} for backup`);
      await dockerService.composeApp(appUrn, 'stop').catch((err) => {
        logger.error(`Failed to stop app ${appUrn}:`, err);
      });

      await backupManager.backupApp(appUrn);

      logger.info('Backup completed!');

      const app = await appsRepository.getAppByUrn(appUrn);
      const maxBackups = app?.maxBackups ?? config.get('userSettings').maxBackups;

      await backupManager.cleanupOldBackups(appUrn, maxBackups);

      return { success: true, message: `App ${appUrn} backed up successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'backup');
    }
  }
}
