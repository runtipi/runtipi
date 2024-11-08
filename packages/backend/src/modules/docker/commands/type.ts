import type { Socket } from 'socket.io';
import { type SocketEvent } from '../../../core/socket/socket-schemas';

export interface DockerCommand {
  execute(Socket: Socket, event: SocketEvent, emit: (event: SocketEvent) => Promise<void>): Promise<void>;
}
