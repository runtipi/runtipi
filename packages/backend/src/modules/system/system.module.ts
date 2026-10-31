import { Module } from '@nestjs/common';
import { DockerModule } from '../docker/docker.module';
import { SystemController } from './system.controller';
import { HostMemoryService } from './host-memory.service';
import { SystemService } from './system.service';

@Module({
  imports: [DockerModule],
  controllers: [SystemController],
  providers: [SystemService, HostMemoryService],
  exports: [],
})
export class SystemModule {}
