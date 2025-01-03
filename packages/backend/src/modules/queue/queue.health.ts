import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable } from '@nestjs/common';
import { type HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import Connection from 'rabbitmq-client';

@Injectable()
export class QueueHealthIndicator {
  private connection;

  constructor(
    private readonly config: ConfigurationService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    const { host, password, username } = this.config.get('queue');

    this.connection = new Connection({ hostname: host, username, password, connectionTimeout: 30000 });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const isHealthy = this.connection.ready;

    if (!isHealthy) {
      return indicator.down();
    }

    return indicator.up();
  }
}
