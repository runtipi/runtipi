import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { DebugService } from './debug.service';
import { DatabaseModule } from '@/core/database/database.module';
import { AppLifecycleModule } from '../app-lifecycle/app-lifecycle.module';
import { AppStoreModule } from '../app-stores/app-store.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [DatabaseModule, AppLifecycleModule, AppStoreModule, MarketplaceModule],
  controllers: [DebugController],
  providers: [DebugService],
  exports: [DebugService],
})
export class DebugModule {}
