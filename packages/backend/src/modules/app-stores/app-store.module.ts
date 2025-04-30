import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { AppStoreRepository } from './app-store.repository';
import { AppStoreService } from './app-store.service';
import { ReposHelpers } from './repos.helpers';

@Module({
  imports: [QueueModule],
  controllers: [],
  providers: [AppStoreService, AppStoreRepository, ReposHelpers],
  exports: [AppStoreService, ReposHelpers],
})
export class AppStoreModule {}
