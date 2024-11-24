import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { AppStoreController } from './app-store.controller';
import { AppStoreService } from './app-store.service';
import { ReposHelpers } from './repos.helpers';

@Module({
  imports: [QueueModule],
  controllers: [AppStoreController],
  providers: [AppStoreService, ReposHelpers],
  exports: [AppStoreService, ReposHelpers],
})
export class AppStoreModule {}
