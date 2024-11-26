import { Module } from '@nestjs/common';
import { AppStoreModule } from '../app-stores/app-store.module';
import { EnvModule } from '../env/env.module';
import { QueueModule } from '../queue/queue.module';
import { AppFilesManager } from './app-files-manager';
import { AppHelpers } from './app.helpers';
import { AppsController } from './apps.controller';
import { AppsRepository } from './apps.repository';
import { AppsService } from './apps.service';

@Module({
  imports: [QueueModule, EnvModule, AppStoreModule],
  controllers: [AppsController],
  providers: [AppFilesManager, AppsRepository, AppHelpers, AppsService],
  exports: [AppsRepository, AppFilesManager, AppHelpers, AppsService],
})
export class AppsModule {}
