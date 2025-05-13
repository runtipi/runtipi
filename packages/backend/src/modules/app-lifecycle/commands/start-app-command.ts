import { LoggerService } from '@/core/logger/logger.service.js';
import { AppFilesManager } from '@/modules/apps/app-files-manager.js';
import { AppHelpers } from '@/modules/apps/app.helpers.js';
import { DockerService } from '@/modules/docker/docker.service.js';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events.js';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command.js';

export class StartAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput, skipEnvGeneration = false) {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });

    try {
      const config = await appFilesManager.getInstalledAppInfo(appUrn);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      logger.info(`Starting app ${appUrn}`);

      await this.ensureAppDir(appUrn, form);

      if (!skipEnvGeneration) {
        logger.info(`Regenerating app.env file for app ${appUrn}`);
        await appHelpers.generateEnvFile(appUrn, form);
      }

      const forcePull = config.force_pull ?? false;
      await dockerService.composeApp(appUrn, `up --detach --force-recreate --remove-orphans ${forcePull ? '--pull always' : ''}`);

      logger.info(`App ${appUrn} started`);

      return { success: true, message: `App ${appUrn} started successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'start');
    }
  }
}
