import { DockerModule } from '@/modules/docker/docker.module';
import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller';
import { SSEService } from './sse.service';

@Module({
  imports: [DockerModule],
  controllers: [SSEController],
  providers: [SSEService],
  exports: [SSEService],
})
export class SSEModule {}
