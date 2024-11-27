import { Module } from '@nestjs/common';
import { AppStoreModule } from '../app-stores/app-store.module';
import { EnvModule } from '../env/env.module';
import { QueueModule } from '../queue/queue.module';
import { AppCatalogService } from './app-catalog.service';
import { AppFilesManager } from './app-files-manager';
import { AppHelpers } from './app.helpers';
import { AppsController } from './apps.controller';
import { AppsRepository } from './apps.repository';

@Module({
  imports: [QueueModule, EnvModule, AppStoreModule],
  controllers: [AppsController],
  providers: [AppFilesManager, AppCatalogService, AppsRepository, AppHelpers],
  exports: [AppCatalogService, AppsRepository, AppFilesManager, AppHelpers],
})
export class AppsModule {}
