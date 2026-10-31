import { LoggerService } from '@/core/logger/logger.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import { DockerService } from '@/modules/docker/docker.service';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { AppLifecycleCommand } from './command';

export class RestoreAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly filename: string,
  ) {
    super(moduleRef, docker);
  }

  public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string; appStopped: boolean }> {
    const logger = this.moduleRef.get(LoggerService, { strict: false });
    const dockerService = this.moduleRef.get(DockerService, { strict: false });
    const backupManager = this.moduleRef.get(BackupManager, { strict: false });

    let appStopped = false;

    try {
      logger.info(`Stopping app ${appUrn} for restore operation`);
      try {
        await dockerService.composeApp(appUrn, 'stop');
      } catch (stopError) {
        const running = await this.docker.listContainers({ filters: { label: [`runtipi.appurn=${appUrn}`] } });
        if (running.length > 0) throw stopError;

        logger.warn(`Compose stop failed for ${appUrn}, but no app containers are running; continuing restore`, stopError);
      }
      appStopped = true;

      await backupManager.restoreApp(appUrn, this.filename);

      logger.info(`App ${appUrn} restored!`);
      return { success: true, message: `App ${appUrn} restored successfully`, appStopped };
    } catch (err) {
      const errorResult = await this.handleAppError(err, appUrn, 'restore');
      return { ...errorResult, appStopped };
    }
  }
}
