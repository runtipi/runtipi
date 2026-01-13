import { ConfigurationService } from '@/core/config/configuration.service';
import { Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { QueueModule } from '../queue/queue.module';
import { AppFilesManager } from './app-files-manager';
import { AppPathsService } from './app-paths.service';
import { AppFileSystemService } from './app-file-system.service';
import { AppSourceFactory } from './sources/app-source.factory';
import { AppHelpers } from './app.helpers';
import { AppsController } from './apps.controller';
import { AppsRepository } from './apps.repository';
import { AppsService } from './apps.service';

@Module({
  imports: [QueueModule, EnvModule, MarketplaceModule],
  controllers: [AppsController],
  providers: [
    AppFilesManager,
    AppPathsService,
    AppFileSystemService,
    AppSourceFactory,
    AppsRepository,
    AppHelpers,
    AppsService,
    ConfigurationService,
  ],
  exports: [AppsRepository, AppFilesManager, AppPathsService, AppFileSystemService, AppSourceFactory, AppHelpers, AppsService],
})
export class AppsModule {}
