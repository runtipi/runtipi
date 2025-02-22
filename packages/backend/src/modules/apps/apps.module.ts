import { Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module';
import { QueueModule } from '../queue/queue.module';
import { AppCatalogService } from './app-catalog.service';
import { AppFilesManager } from './app-files-manager';
import { AppHelpers } from './app.helpers';
import { AppsController } from './apps.controller';
import { AppsRepository } from './apps.repository';
import { ConfigurationService } from '@/core/config/configuration.service';

@Module({
  imports: [QueueModule, EnvModule],
  controllers: [AppsController],
  providers: [AppFilesManager, AppCatalogService, AppsRepository, AppHelpers, ConfigurationService],
  exports: [AppCatalogService, AppsRepository, AppFilesManager, AppHelpers],
})
export class AppsModule {}
