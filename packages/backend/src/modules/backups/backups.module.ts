import { ArchiveModule } from '@/core/archive/archive.module';
import { SocketModule } from '@/core/socket/socket.module';
import { Module, forwardRef } from '@nestjs/common';
import { AppLifecycleModule } from '../app-lifecycle/app-lifecycle.module';
import { AppsModule } from '../apps/apps.module';
import { QueueModule } from '../queue/queue.module';
import { BackupManager } from './backup.manager';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({
  imports: [forwardRef(() => AppLifecycleModule), AppsModule, QueueModule, SocketModule, ArchiveModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupManager],
  exports: [BackupsService, BackupManager],
})
export class BackupsModule {}
