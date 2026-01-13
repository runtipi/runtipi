import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { DockerService } from '@/modules/docker/docker.service';
import { AppInstallationService } from '@/modules/app-lifecycle/services/app-installation.service';
import { AppSourceFactory } from '@/modules/apps/sources/app-source.factory';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { AppLifecycleCommand } from './command';

export class InstallAppCommand extends AppLifecycleCommand {
  public async execute(appUrn: AppUrn, form: AppEventFormInput): Promise<{ success: boolean; message: string }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const installationService = this.moduleRef.get(AppInstallationService, { strict: false });
    const appSourceFactory = this.moduleRef.get(AppSourceFactory, { strict: false });

    const source = appSourceFactory.getSource(appUrn);
    const compose = await source.getCompose();

    if (!compose) {
      return this.handleAppError(`Failed to retrieve valid docker-compose for app ${appUrn}`, appUrn, 'install_error');
    }

    try {
      await installationService.prepareInstallation(appUrn, form);

      try {
        await dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (_) {
        logger.warn(`No prior containers to remove for app ${appUrn}`);
      }

      const config = await appFilesManager.getInstalledAppInfo(appUrn);
      if (!config) {
        return { success: true, message: 'App config not found post-installation. Skipping run...' };
      }

      if (form.skipRun) {
        logger.info(`Skipping docker-compose up for app ${appUrn} as per request`);
        return { success: true, message: `App ${appUrn} installed successfully (skipped run)` };
      }

      // run docker-compose up
      const forcePull = config.force_pull ?? false;
      await dockerService.composeApp(appUrn, `up --detach --force-recreate --remove-orphans ${forcePull ? '--pull always' : ''}`);

      return { success: true, message: `App ${appUrn} installed successfully` };
    } catch (err) {
      return this.handleAppError(err, appUrn, 'install');
    }
  }
}
