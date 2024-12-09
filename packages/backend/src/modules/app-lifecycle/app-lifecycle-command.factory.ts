import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppHelpers } from '../apps/app.helpers';
import { BackupManager } from '../backups/backup.manager';
import { DockerService } from '../docker/docker.service';
import { EnvUtils } from '../env/env.utils';
import { MarketplaceService } from '../marketplace/marketplace.service';
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
    private readonly appFilesManager: AppFilesManager,
    private readonly logger: LoggerService,
    private readonly appHelpers: AppHelpers,
    private readonly envUtils: EnvUtils,
    private readonly dockerService: DockerService,
    private readonly backupManager: BackupManager,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  createCommand(eventData: z.infer<typeof appEventSchema>) {
    const command = eventData.command;

    switch (command) {
      case 'install':
        return new InstallAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.appHelpers, this.envUtils);
      case 'start':
        return new StartAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.appHelpers);
      case 'stop':
        return new StopAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.appHelpers);
      case 'restart':
        return new RestartAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.appHelpers);
      case 'uninstall':
        return new UninstallAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService);
      case 'reset':
        return new ResetAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.appHelpers, this.envUtils);
      case 'backup':
        return new BackupAppCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.backupManager);
      case 'restore':
        return new RestoreAppCommand(
          this.logger,
          this.appFilesManager,
          this.dockerService,
          this.marketplaceService,
          this.backupManager,
          eventData.filename,
        );
      case 'generate_env':
        return new GenerateAppEnvCommand(this.logger, this.appFilesManager, this.dockerService, this.marketplaceService, this.appHelpers);
      case 'update':
        return new UpdateAppCommand(
          this.logger,
          this.appFilesManager,
          this.dockerService,
          this.marketplaceService,
          this.appHelpers,
          this.backupManager,
          eventData.performBackup,
        );
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
