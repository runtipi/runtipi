import { SocketEvent } from '@runtipi/shared';
import { Server } from 'socket.io';
import { logger } from '../logger';
import { handleViewLogsEvent } from '../docker';

class SocketManager {
  private io: Server | null = null;

  init() {
    const io = new Server(5001, { cors: { origin: '*' }, path: '/worker/socket.io' });

    io.on('connection', async (socket) => {

      socket.on('viewLogs', (appId) => handleViewLogsEvent(socket, appId));

      socket.on('disconnect', () => {});
    });

    this.io = io;
  }

  async emit(event: SocketEvent) {
    if (!this.io) {
      logger.error('SocketManager is not initialized');
      return;
    }

    try {
      const sockets = await this.io.fetchSockets();

      // eslint-disable-next-line no-restricted-syntax
      for (const socket of sockets) {
        try {
          socket.emit(event.type, event);
        } catch (error) {
          logger.error('Error sending socket event:', error);
        }
      }
    } catch (error) {
      logger.error('Error emitting socket event:', error);
    }
  }
}

const instance = new SocketManager();

export { instance as SocketManager };
