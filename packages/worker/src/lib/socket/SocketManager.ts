import { SocketEvent } from '@runtipi/shared/src/schemas/socket';
import { Server } from 'socket.io';
import { logger } from '../logger';

class SocketManager {
  private io: Server | null = null;

  init() {
    const io = new Server(3001, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
      socket.on('disconnect', () => {});
    });

    this.io = io;
  }

  async emit(event: SocketEvent) {
    if (!this.io) {
      logger.error('SocketManager is not initialized');
      return;
    }

    const sockets = await this.io.fetchSockets();

    // eslint-disable-next-line no-restricted-syntax
    for (const socket of sockets) {
      socket.emit(event.type, event);
    }
  }
}

const instance = new SocketManager();

export { instance as SocketManager };
