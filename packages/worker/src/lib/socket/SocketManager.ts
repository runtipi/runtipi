import type { SocketEvent } from '@runtipi/shared';
import type { ILogger } from '@runtipi/shared/src/node';
import { inject, injectable } from 'inversify';
import { Server } from 'socket.io';
import { handleViewAppLogsEvent, handleViewRuntipiLogsEvent } from '../docker';

export interface ISocketManager {
  init(): void;
  emit(event: SocketEvent): Promise<void>;
}

@injectable()
export class SocketManager implements ISocketManager {
  private io: Server | null = null;

  constructor(@inject('ILogger') private logger: ILogger) {}

  init() {
    const io = new Server(5001, { cors: { origin: '*' }, path: '/worker/socket.io' });
    this.logger.info('SocketManager initialized');

    io.on('connection', async (socket) => {
      this.logger.debug('Client connected to socket', socket.id);
      socket.on('app-logs-init', (event) => handleViewAppLogsEvent(socket, event, this.emit.bind(this)));
      socket.on('runtipi-logs-init', (event) => handleViewRuntipiLogsEvent(socket, event, this.emit.bind(this)));
      socket.on('disconnect', () => {});
    });

    this.io = io;
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
