import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class UninstallAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput) {
    try {
      this.logger.info(`Uninstalling app ${appUrn}`);
      await this.ensureAppDir(appUrn, form);

      await this.dockerService.composeApp(appUrn, 'down --remove-orphans --volumes --rmi all').catch((err) => {
        this.logger.warn(
          `Could not fully uninstall app ${appUrn}. Some images may be in use by other apps or a folder has been deleted. Consider cleaning unused images docker system prune -a`,
          err,
        );
      });

      await this.appFilesManager.deleteAppFolder(appUrn);
      await this.appFilesManager.deleteAppDataDir(appUrn);

      this.logger.info(`App ${appUrn} uninstalled`);

      return { success: true, message: `App ${appUrn} uninstalled successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'uninstall');
    }
  }
}
