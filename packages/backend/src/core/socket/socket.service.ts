import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { LoggerService } from '../logger/logger.service';
import type { SocketEvent } from './socket-schemas';

@Injectable()
export class SocketManager {
  public io: Server | null = null;

  constructor(private logger: LoggerService) {}

  init() {
    if (this.io) {
      return this.io;
    }

    const io = new Server(5001, { cors: { origin: '*' }, path: '/api/socket.io' });
    this.logger.info('SocketManager initialized');

    io.on('disconnect', (socket) => {
      this.logger.debug('Client disconnected from socket', socket.id);
    });

    io.on('error', (error) => {
      this.logger.error('SocketManager error:', error);
    });

    this.io = io;

    return io;
  }

  async isConnected() {
    if (!this.io) {
      return false;
    }

    return this.io.httpServer.listening;
  }

  async emit(event: SocketEvent) {
    if (!this.io) {
      this.logger.error('SocketManager is not initialized');
      return;
    }

    try {
      const sockets = await this.io.fetchSockets();

      for (const socket of sockets) {
        try {
          socket.emit(event.type, event);
        } catch (error) {
          this.logger.error('Error sending socket event:', error);
        }
      }
    } catch (error) {
      this.logger.error('Error emitting socket event:', error);
    }
  }
}
