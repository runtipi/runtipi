import { Module } from '@nestjs/common';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';
import { AppsModule } from '../apps/apps.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [AppsModule, MarketplaceModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
