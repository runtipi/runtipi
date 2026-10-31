import { ArchiveModule } from '@/core/archive/archive.module';
import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { DockerModule } from '../docker/docker.module';
import { BackupManager } from './backup.manager';

@Module({
  imports: [AppsModule, ArchiveModule, DockerModule],
  providers: [BackupManager],
  exports: [BackupManager],
})
export class BackupManagerModule {}
