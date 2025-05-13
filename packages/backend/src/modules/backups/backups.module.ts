import { ArchiveModule } from '@/core/archive/archive.module.js';
import { SSEModule } from '@/core/sse/sse.module.js';
import { Module, forwardRef } from '@nestjs/common';
import { AppLifecycleModule } from '../app-lifecycle/app-lifecycle.module.js';
import { AppsModule } from '../apps/apps.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { BackupManager } from './backup.manager.js';
import { BackupsController } from './backups.controller.js';
import { BackupsService } from './backups.service.js';

@Module({
  imports: [forwardRef(() => AppLifecycleModule), AppsModule, QueueModule, ArchiveModule, SSEModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupManager],
  exports: [BackupsService, BackupManager],
})
export class BackupsModule {}
