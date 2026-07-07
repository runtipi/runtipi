import { Module } from '@nestjs/common';
import { AppLifecycleModule } from '../app-lifecycle/app-lifecycle.module';
import { AppsModule } from '../apps/apps.module';
import { BackupManagerModule } from './backup-manager.module';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({
  imports: [AppLifecycleModule, AppsModule, BackupManagerModule],
  controllers: [BackupsController],
  providers: [BackupsService],
  exports: [BackupsService],
})
export class BackupsModule {}
