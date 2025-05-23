import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type Dockerode from 'dockerode';
import type { z } from 'zod';
import { DOCKERODE } from '../docker/docker.module';
import type { appEventSchema } from '../queue/entities/app-events';
import { BackupAppCommand } from './commands/backup-app-command';
import { GenerateAppEnvCommand } from './commands/generate-env-command';
import { InstallAppCommand } from './commands/install-app-command';
import { ResetAppCommand } from './commands/reset-app-command';
import { RestartAppCommand } from './commands/restart-app-command';
import { RestoreAppCommand } from './commands/restore-app-command';
import { StartAppCommand } from './commands/start-app-command';
import { StopAppCommand } from './commands/stop-app-command';
import { UninstallAppCommand } from './commands/uninstall-app-command';
import { UpdateAppCommand } from './commands/update-app-command';

@Injectable()
export class AppLifecycleCommandFactory {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {}

  createCommand(eventData: z.infer<typeof appEventSchema>) {
    const command = eventData.command;

    switch (command) {
      case 'install':
        return new InstallAppCommand(this.moduleRef, this.docker);
      case 'start':
        return new StartAppCommand(this.moduleRef, this.docker);
      case 'stop':
        return new StopAppCommand(this.moduleRef, this.docker);
      case 'restart':
        return new RestartAppCommand(this.moduleRef, this.docker);
      case 'uninstall':
        return new UninstallAppCommand(this.moduleRef, this.docker);
      case 'reset':
        return new ResetAppCommand(this.moduleRef, this.docker);
      case 'backup':
        return new BackupAppCommand(this.moduleRef, this.docker);
      case 'restore':
        return new RestoreAppCommand(this.moduleRef, this.docker, eventData.filename);
      case 'generate_env':
        return new GenerateAppEnvCommand(this.moduleRef, this.docker);
      case 'update':
        return new UpdateAppCommand(this.moduleRef, this.docker, eventData.performBackup);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
