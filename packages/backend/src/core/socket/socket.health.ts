import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { SocketManager } from './socket.service';

@Injectable()
export class SocketHealthIndicator extends HealthIndicator {
  constructor(private readonly socketManager: SocketManager) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isConnected = await this.socketManager.isConnected();

    if (isConnected) {
      return Promise.resolve(this.getStatus(key, true));
    }

    throw new HealthCheckError(
      'Websocket check failed',
      this.getStatus(key, false, {
        message: 'Not connected to websocket server',
      }),
    );
  }
}
