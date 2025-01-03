import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { Connection } from 'rabbitmq-client';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private connection = new Connection({
    url: 'amqp://guest:guest@localhost:5672',
    connectionTimeout: 30000,
  });

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = this.connection.ready;

    const result = this.getStatus(key, isHealthy);

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Queue healthcheck failed', result);
  }
}
