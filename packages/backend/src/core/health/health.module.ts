import { QueueModule } from '@/modules/queue/queue.module';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SocketModule } from '../socket/socket.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule, QueueModule, SocketModule],
  providers: [],
})
export class HealthModule {}
