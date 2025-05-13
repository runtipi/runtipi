import { LoggerService } from '@/core/logger/logger.service.js';
import { AppFilesManager } from '@/modules/apps/app-files-manager.js';
import { DockerService } from '@/modules/docker/docker.service.js';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command.js';

export class UninstallAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });

    try {
      logger.info(`Uninstalling app ${appUrn}`);

      try {
        await dockerService.composeApp(appUrn, 'down --remove-orphans -v --rmi all');
        logger.info(`Successfully cleaned up all Docker resources for ${appUrn}`);
      } catch (err) {
        logger.warn('Error taking down app', appUrn, err);
      }

      await appFilesManager.deleteAppFolder(appUrn);

      return { success: true, message: `App ${appUrn} uninstalled successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'uninstall');
    }
  }
}
