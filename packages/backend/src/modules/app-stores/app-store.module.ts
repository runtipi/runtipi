import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { AppStoreController } from './app-store.controller';
import { AppStoreRepository } from './app-store.repository';
import { AppStoreService } from './app-store.service';
import { ReposHelpers } from './repos.helpers';

@Module({
  imports: [QueueModule],
  controllers: [AppStoreController],
  providers: [AppStoreService, AppStoreRepository, ReposHelpers],
  exports: [AppStoreService, ReposHelpers],
})
export class AppStoreModule {}
