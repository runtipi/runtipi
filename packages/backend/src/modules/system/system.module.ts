import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { AppsModule } from '../apps/apps.module';
import { DockerModule } from '../docker/docker.module';
import { AppDiskUsageService } from './app-disk-usage.service';
import { HostMemoryService } from './host-memory.service';
import { SystemMetricsService } from './system-metrics.service';
import { SystemService } from './system.service';

@Module({
  imports: [DockerModule, AppsModule],
  controllers: [SystemController],
  providers: [SystemService, SystemMetricsService, AppDiskUsageService, HostMemoryService],
  exports: [],
})
export class SystemModule {}
