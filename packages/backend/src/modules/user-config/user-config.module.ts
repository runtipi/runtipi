import { Module } from '@nestjs/common';
import { AppLifecycleModule } from '../app-lifecycle/app-lifecycle.module';
import { AppsModule } from '../apps/apps.module';
import { UserConfigController } from './user-config.controller';
import { UserConfigService } from './user-config.service';

@Module({
  imports: [AppLifecycleModule, AppsModule],
  controllers: [UserConfigController],
  providers: [UserConfigService],
})
export class UserConfigModule {}
