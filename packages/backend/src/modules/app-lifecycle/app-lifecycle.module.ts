import { SSEModule } from '@/core/sse/sse.module.js';
import { Module, forwardRef } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module.js';
import { BackupsModule } from '../backups/backups.module.js';
import { DockerModule } from '../docker/docker.module.js';
import { EnvModule } from '../env/env.module.js';
import { MarketplaceModule } from '../marketplace/marketplace.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory.js';
import { AppLifecycleController } from './app-lifecycle.controller.js';
import { AppLifecycleService } from './app-lifecycle.service.js';

@Module({
  imports: [QueueModule, AppsModule, EnvModule, DockerModule, MarketplaceModule, forwardRef(() => BackupsModule), SSEModule],
  providers: [AppLifecycleService, AppLifecycleCommandFactory],
  controllers: [AppLifecycleController],
  exports: [AppLifecycleService],
})
export class AppLifecycleModule {}
