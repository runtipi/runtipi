import { SSEModule } from '@/core/sse/sse.module';
import { Module, forwardRef } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { BackupsModule } from '../backups/backups.module';
import { DockerModule } from '../docker/docker.module';
import { EnvModule } from '../env/env.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { QueueModule } from '../queue/queue.module';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';
import { AppLifecycleController } from './app-lifecycle.controller';
import { AppLifecycleService } from './app-lifecycle.service';
import { AppStatusSyncService } from './app-status-sync.service';
import { StatusManagerService } from './services/status-manager.service';
import { AppValidationService } from './services/app-validation.service';
import { StartAppHandler } from './handlers/start-app.handler';
import { StopAppHandler } from './handlers/stop-app.handler';
import { RestartAppHandler } from './handlers/restart-app.handler';
import { InstallAppHandler } from './handlers/install-app.handler';
import { UninstallAppHandler } from './handlers/uninstall-app.handler';
import { ResetAppHandler } from './handlers/reset-app.handler';
import { UpdateConfigHandler } from './handlers/update-config.handler';
import { UpdateAppHandler } from './handlers/update-app.handler';

@Module({
  imports: [QueueModule, AppsModule, EnvModule, DockerModule, MarketplaceModule, forwardRef(() => BackupsModule), SSEModule],
  providers: [
    AppLifecycleService,
    AppLifecycleCommandFactory,
    AppStatusSyncService,
    StatusManagerService,
    AppValidationService,
    StartAppHandler,
    StopAppHandler,
    RestartAppHandler,
    InstallAppHandler,
    UninstallAppHandler,
    ResetAppHandler,
    UpdateConfigHandler,
    UpdateAppHandler,
  ],
  controllers: [AppLifecycleController],
  exports: [AppLifecycleService, AppStatusSyncService],
})
export class AppLifecycleModule {}
