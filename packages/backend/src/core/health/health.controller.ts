import { QueueHealthIndicator } from '@/modules/queue/queue.health';
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private queueHealthIndicator: QueueHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.queueHealthIndicator.isHealthy('queue')]);
  }
}
