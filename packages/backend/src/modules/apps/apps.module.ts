import { ConfigurationService } from '@/core/config/configuration.service.js';
import { Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module.js';
import { MarketplaceModule } from '../marketplace/marketplace.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { AppFilesManager } from './app-files-manager.js';
import { AppHelpers } from './app.helpers.js';
import { AppsController } from './apps.controller.js';
import { AppsRepository } from './apps.repository.js';
import { AppsService } from './apps.service.js';

@Module({
  imports: [QueueModule, EnvModule, MarketplaceModule],
  controllers: [AppsController],
  providers: [AppFilesManager, AppsRepository, AppHelpers, AppsService, ConfigurationService],
  exports: [AppsRepository, AppFilesManager, AppHelpers, AppsService],
})
export class AppsModule {}
