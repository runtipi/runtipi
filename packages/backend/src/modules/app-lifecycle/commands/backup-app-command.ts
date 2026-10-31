import { BackupManager, BackupRecoveryError } from '@/modules/backups/backup.manager';
import type { AppUrn } from '@runtipi/common/types';
import type { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import type { AppJobContext } from '../services/app-job.service';
import { AppLifecycleCommand } from './command';

export class BackupAppCommand extends AppLifecycleCommand {
  constructor(
    moduleRef: ModuleRef,
    docker: Dockerode,
    private readonly wasRunningBeforeBackup: boolean,
    private readonly context?: AppJobContext,
  ) {
    super(moduleRef, docker);
  }

  public async execute(appUrn: AppUrn) {
    const backups = this.moduleRef.get(BackupManager, { strict: false });

    try {
      await backups.backupApp(appUrn, this.wasRunningBeforeBackup, this.context);

      return { success: true, message: `App ${appUrn} backed up successfully` };
    } catch (error) {
      return { ...(await this.handleAppError(error, appUrn, 'backup')), rollbackSucceeded: !(error instanceof BackupRecoveryError) };
    }
  }
}
