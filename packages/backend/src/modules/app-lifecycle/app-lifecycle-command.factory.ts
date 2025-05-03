import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { z } from 'zod';
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
  constructor(private readonly moduleRef: ModuleRef) {}

  createCommand(eventData: z.infer<typeof appEventSchema>) {
    const command = eventData.command;

    switch (command) {
      case 'install':
        return new InstallAppCommand(this.moduleRef);
      case 'start':
        return new StartAppCommand(this.moduleRef);
      case 'stop':
        return new StopAppCommand(this.moduleRef);
      case 'restart':
        return new RestartAppCommand(this.moduleRef);
      case 'uninstall':
        return new UninstallAppCommand(this.moduleRef);
      case 'reset':
        return new ResetAppCommand(this.moduleRef);
      case 'backup':
        return new BackupAppCommand(this.moduleRef);
      case 'restore':
        return new RestoreAppCommand(this.moduleRef, eventData.filename);
      case 'generate_env':
        return new GenerateAppEnvCommand(this.moduleRef);
      case 'update':
        return new UpdateAppCommand(this.moduleRef, eventData.performBackup);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
