import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module.js';
import { AppStoreRepository } from './app-store.repository.js';
import { AppStoreService } from './app-store.service.js';
import { ReposHelpers } from './repos.helpers.js';

@Module({
  imports: [QueueModule],
  controllers: [],
  providers: [AppStoreService, AppStoreRepository, ReposHelpers],
  exports: [AppStoreService, ReposHelpers],
})
export class AppStoreModule {}
