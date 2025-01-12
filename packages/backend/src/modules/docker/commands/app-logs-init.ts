import { spawn } from 'node:child_process';
import type { AppUrn } from '@/types/app/app.types';
import type { Socket } from 'socket.io';
import { type SocketEvent, socketEventSchema } from '../../../core/socket/socket-schemas';
import type { DockerService } from '../docker.service';
import { colorizeLogs } from '../helpers/colorize-logs';
import type { DockerCommand } from './type';

export class AppLogsCommand implements DockerCommand {
  constructor(private readonly dockerService: DockerService) {}

  async execute(socket: Socket, event: SocketEvent, emit: (event: SocketEvent) => Promise<void>) {
    const parsedEvent = socketEventSchema.safeParse(event);

    if (!parsedEvent.success) {
      return;
    }

    if (parsedEvent.data.type !== 'app-logs-init') {
      return;
    }

    const { appUrn, maxLines } = parsedEvent.data.data;
    const { args } = await this.dockerService.getBaseComposeArgsApp(appUrn as AppUrn);

    args.push(`logs --follow -n ${maxLines || 25}`);

    const logsCommand = `docker-compose ${args.join(' ')}`;

    const logs = spawn('sh', ['-c', logsCommand]);

    socket.on('disconnect', () => {
      logs.kill('SIGINT');
    });

    socket.on('app-logs', (data) => {
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
        type: 'app-logs',
        event: 'newLogs',
        data: { lines, appUrn },
      });
    });
  }
}
