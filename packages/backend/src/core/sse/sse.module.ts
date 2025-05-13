import { DockerModule } from '@/modules/docker/docker.module.js';
import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller.js';
import { SSEService } from './sse.service.js';

@Module({
  imports: [DockerModule],
  controllers: [SSEController],
  providers: [SSEService],
  exports: [SSEService],
})
export class SSEModule {}
