import { container } from 'src/inversify.config';
import type { ISocketManager } from './SocketManager';

export const socketManager = container.get<ISocketManager>('ISocketManager');
