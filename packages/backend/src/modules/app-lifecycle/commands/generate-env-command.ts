import { LoggerService } from '@/core/logger/logger.service';
import { AppHelpers } from '@/modules/apps/app.helpers';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class GenerateAppEnvCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });

    try {
      logger.info(`Regenerating app.env file for app ${appUrn}`);
      await this.ensureAppDir(appUrn, form);
      await appHelpers.generateEnvFile(appUrn, form);

      return { success: true, message: `App ${appUrn} env file regenerated successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'generate_env_error');
    }
  }
}
