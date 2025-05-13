import { QueueModule } from '@/modules/queue/queue.module.js';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule, QueueModule],
  providers: [],
})
export class HealthModule {}
