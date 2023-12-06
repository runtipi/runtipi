import { SocketEvent } from '@runtipi/shared';
import { Socket } from 'socket.io';
import { logger } from '../logger';

class SocketManager {
  private socket: Socket | null = null;

  addSocket(socket: Socket) {
    if (!this.socket) {
      this.socket = socket;
    }
  }

  removeSocket() {
    this.socket = null;
  }

  emit(event: SocketEvent) {
    if (!this.socket) {
      logger.warn('Socket is not connected');
      return;
    }

    this.socket.emit(event.type, event);
  }
}

const instance = new SocketManager();

export { instance as SocketManager };
