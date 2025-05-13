import { Module } from '@nestjs/common';
import { AppStoreModule } from '../app-stores/app-store.module.js';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

@Module({
  imports: [AppStoreModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
