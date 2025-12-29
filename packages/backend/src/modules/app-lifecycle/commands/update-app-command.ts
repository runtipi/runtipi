import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppHelpers } from '@/modules/apps/app.helpers';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { AppLifecycleCommand } from './command';
import { parseComposeJson } from '@runtipi/common/schemas';

export class UpdateAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly performBackup: boolean = true,
  ) {
    super(moduleRef, docker);
  }

  public async execute(
    appUrn: AppUrn,
    form: AppEventFormInput,
    resolve: ({ success, message }: { success: boolean; message: string }) => void,
  ): Promise<void> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const appFilesManager = this.moduleRef.get(AppFilesManager, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const marketplaceService = this.moduleRef.get(MarketplaceService, { strict: false });
    const appHelpers = this.moduleRef.get(AppHelpers, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    try {
      const composeToInstall = await marketplaceService.getDockerComposeJson(appUrn);
      parseComposeJson(composeToInstall.content);
    } catch (err) {
      logger.error(`Error parsing docker-compose.yml for app ${appUrn} from marketplace repository. Are you running the latest version of runtipi?`);
      resolve(await this.handleAppError(err, appUrn, 'update_error'));
    }

    try {
      if (this.performBackup) {
        await dockerService.composeApp(appUrn, 'stop');
        await backupManager.backupApp(appUrn);
      }

      logger.info(`Updating app ${appUrn}`);
      await this.ensureAppDir(appUrn, form);
      await appHelpers.generateEnvFile(appUrn, form);

      try {
        await dockerService.composeApp(appUrn, 'up --detach --force-recreate --remove-orphans');
        await dockerService.composeApp(appUrn, 'down --rmi all --remove-orphans');
      } catch (_) {
        logger.warn(`App ${appUrn} has likely a broken docker-compose.yml file. Continuing with update...`);
      }

      await appFilesManager.deleteAppFolder(appUrn);
      await marketplaceService.copyAppFromRepoToInstalled(appUrn);

      await this.ensureAppDir(appUrn, form);

      await dockerService.composeApp(appUrn, 'pull');

      resolve({ success: true, message: `App ${appUrn} updated successfully` });
    } catch (err) {
      resolve(await this.handleAppError(err, appUrn, 'update_error'));
    }
  }
}
