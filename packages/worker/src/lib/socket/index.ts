import { container } from 'src/inversify.config';
import { ISocketManager } from './SocketManager';

export const socketManager = container.get<ISocketManager>('ISocketManager');
