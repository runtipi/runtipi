import { Module } from '@nestjs/common';
import { SocketHealthIndicator } from './socket.health';
import { SocketManager } from './socket.service';

@Module({
  imports: [],
  providers: [SocketManager, SocketHealthIndicator],
  exports: [SocketManager, SocketHealthIndicator],
})
export class SocketModule {}
