import { ConfigurationService } from '@/core/config/configuration.service';
import { Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { QueueModule } from '../queue/queue.module';
import { AppFilesManager } from './app-files-manager';
import { AppHelpers } from './app.helpers';
import { AppsController } from './apps.controller';
import { AppsRepository } from './apps.repository';
import { AppsService } from './apps.service';

@Module({
  imports: [QueueModule, EnvModule, MarketplaceModule],
  controllers: [AppsController],
  providers: [AppFilesManager, AppsRepository, AppHelpers, AppsService, ConfigurationService],
  exports: [AppsRepository, AppFilesManager, AppHelpers, AppsService],
})
export class AppsModule {}
