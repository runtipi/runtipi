import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { DockerService } from '@/modules/docker/docker.service';
import type { EnvUtils } from '@/modules/env/env.utils';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { AppLifecycleCommand } from './command';

export class ResetAppCommand extends AppLifecycleCommand {
  constructor(
    logger: LoggerService,
    appFilesManager: AppFilesManager,
    dockerService: DockerService,
    private readonly appHelpers: AppHelpers,
    private readonly envUtils: EnvUtils,
  ) {
    super(logger, appFilesManager, dockerService);

    this.logger = logger;
    this.appFilesManager = appFilesManager;
  }

  public async execute(appId: string, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.info(`Resetting app ${appId}`);

      await this.ensureAppDir(appId, form);
      await this.appHelpers.generateEnvFile(appId, form);

      // Stop app
      try {
        await this.dockerService.composeApp(appId, 'down --remove-orphans --volumes');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          this.logger.warn(`Could not reset app ${appId}. Most likely there have been made changes to the compose file.`);
        } else {
          throw err;
        }
      }

      // Delete app data directory
      await this.appFilesManager.deleteAppDataDir(appId);
      await this.appFilesManager.createAppDataDir(appId);

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await this.appHelpers.generateEnvFile(appId, form);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appId}`);
      const env = await this.appFilesManager.getAppEnv(appId);
      const envMap = this.envUtils.envStringToMap(env.content);

      await this.appFilesManager.copyDataDir(appId, envMap);
      await this.ensureAppDir(appId, form);

      return { success: true, message: `App ${appId} reset successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'reset');
    }
  }
}
