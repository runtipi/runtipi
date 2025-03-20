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

@Module({
  imports: [QueueModule, AppsModule, EnvModule, DockerModule, MarketplaceModule, forwardRef(() => BackupsModule), SSEModule],
  providers: [AppLifecycleService, AppLifecycleCommandFactory],
  controllers: [AppLifecycleController],
  exports: [AppLifecycleService],
})
export class AppLifecycleModule {}
