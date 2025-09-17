import { ConfigurationService } from '@/core/config/configuration.service';
import { Module } from '@nestjs/common';
import { EnvModule } from '../env/env.module';
import { CustomAppController } from './custom-apps.controller';
import { CustomAppService } from './custom-apps.service';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [EnvModule, AppsModule],
  controllers: [CustomAppController],
  providers: [CustomAppService, ConfigurationService],
  exports: [CustomAppService],
})
export class CustomAppsModule {}
