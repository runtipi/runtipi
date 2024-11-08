import { QueueHealthIndicator } from '@/modules/queue/queue.health';
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SocketHealthIndicator } from '../socket/socket.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private queueHealthIndicator: QueueHealthIndicator,
    private socketHealthIndicator: SocketHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.queueHealthIndicator.isHealthy('queue'), () => this.socketHealthIndicator.isHealthy('socket')]);
  }
}
