import { spawn } from 'node:child_process';
import type { Socket } from 'socket.io';
import { type SocketEvent, socketEventSchema } from '../../../core/socket/socket-schemas';
import type { DockerService } from '../docker.service';
import { colorizeLogs } from '../helpers/colorize-logs';
import type { DockerCommand } from './type';

export class RuntipiLogsCommand implements DockerCommand {
  constructor(private readonly dockerService: DockerService) {}

  async execute(socket: Socket, event: SocketEvent, emit: (event: SocketEvent) => Promise<void>) {
    const { success, data } = socketEventSchema.safeParse(event);

    if (!success) {
      return;
    }

    if (data.type !== 'runtipi-logs-init') {
      return;
    }

    const { maxLines } = data.data;

    const args = await this.dockerService.getBaseComposeArgsRuntipi();

    args.push(`logs --follow -n ${maxLines || 25}`);

    const logsCommand = `docker-compose ${args.join(' ')}`;

    const logs = spawn('sh', ['-c', logsCommand]);

    socket.on('disconnect', () => {
      logs.kill('SIGINT');
    });

    socket.on('runtipi-logs', (data) => {
      if (data.event === 'stopLogs') {
        logs.kill('SIGINT');
      }
    });

    logs.on('error', () => {
      logs.kill('SIGINT');
    });

    logs.stdout.on('data', async (data) => {
      const lines = await colorizeLogs(
        data
          .toString()
          .split(/(?:\r\n|\r|\n)/g)
          .filter(Boolean),
      );

      await emit({
        type: 'runtipi-logs',
        event: 'newLogs',
        data: { lines },
      });
    });
  }
}
