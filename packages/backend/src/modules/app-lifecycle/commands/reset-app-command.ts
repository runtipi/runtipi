import { LoggerService } from '@/core/logger/logger.service';
import { DockerService } from '@/modules/docker/docker.service';
import { AppInstallationService } from '@/modules/app-lifecycle/services/app-installation.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class ResetAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const installationService = this.moduleRef.get(AppInstallationService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });

    try {
      logger.info(`Resetting app ${appUrn}`);

      // Stop app and remove volumes
      try {
        await dockerService.composeApp(appUrn, 'down --remove-orphans --volumes');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          logger.warn(`Could not reset app ${appUrn}. Most likely there have been made changes to the compose file.`);
        } else {
          throw err;
        }
      }

      // Delete app data directory to ensure a clean slate
      await appFilesManager.deleteAppDataDir(appUrn);

      // Re-prepare the app environment
      await installationService.prepareInstallation(appUrn, form);

      return { success: true, message: `App ${appUrn} reset successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'reset');
    }
  }
}
