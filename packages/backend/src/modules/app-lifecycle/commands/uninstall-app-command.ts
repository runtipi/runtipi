import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';

export class UninstallAppCommand extends AppLifecycleCommand {
  public async execute(
    appUrn: AppUrn,
    _form: AppEventFormInput,
    resolve: ({ success, message }: { success: boolean; message: string }) => void,
  ): Promise<void> {
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
      await appFilesManager.deleteAppDataDir(appUrn);

      resolve({ success: true, message: `App ${appUrn} uninstalled successfully` });
    } catch (err) {
      resolve(await this.handleAppError(err, appUrn, 'uninstall'));
    }
  }
}
