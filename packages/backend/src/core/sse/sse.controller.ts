import { AuthGuard } from '@/modules/auth/auth.guard';
import { DockerService } from '@/modules/docker/docker.service';
import { colorizeLogs } from '@/modules/docker/helpers/colorize-logs';
import type { AppUrn } from '@/types/app/app.types';
import { Controller, type MessageEvent, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SSEService } from './sse.service';

@UseGuards(AuthGuard)
@Controller('sse')
export class SSEController {
  constructor(
    private readonly sseService: SSEService,
    private readonly dockerService: DockerService,
  ) {}

  @Sse('app')
  appEvents(): Observable<MessageEvent> {
    const observable = this.sseService.getTopicObservable('app');

    return observable;
  }

  @Sse('app-logs')
  @ApiQuery({ name: 'appUrn', type: String, required: true })
  @ApiQuery({ name: 'maxLines', type: Number, required: false })
  async appLogsEvents(@Query('appUrn') appUrn: AppUrn, @Query('maxLines') maxLines: number): Promise<Observable<MessageEvent>> {
    const { on, kill } = await this.dockerService.getAppLogs(appUrn, maxLines);

    return new Observable((subscriber) => {
      const observable = this.sseService.getTopicObservable('app-logs', appUrn);

      const subscription = observable.subscribe({
        next: (event) => subscriber.next(event),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      on('data', async (data) => {
        const lines = await colorizeLogs(
          data
            .toString()
            .split(/(?:\r\n|\r|\n)/g)
            .filter(Boolean),
        );

        this.sseService.emit(
          'app-logs',
          {
            appUrn,
            lines,
            event: 'newLogs',
          },
          appUrn,
        );
      });

      return () => {
        kill();
        subscription.unsubscribe();
      };
    });
  }

  @Sse('runtipi-logs')
  @ApiQuery({ name: 'maxLines', type: Number, required: false })
  async runtipiLogsEvents(@Query('maxLines') maxLines: number): Promise<Observable<MessageEvent>> {
    const { on, kill } = await this.dockerService.getRuntipiLogs(maxLines);

    return new Observable((subscriber) => {
      const observable = this.sseService.getTopicObservable('runtipi-logs');

      const subscription = observable.subscribe({
        next: (event) => subscriber.next(event),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      on('data', async (data) => {
        const lines = await colorizeLogs(
          data
            .toString()
            .split(/(?:\r\n|\r|\n)/g)
            .filter(Boolean),
        );

        this.sseService.emit('runtipi-logs', { lines, event: 'newLogs' });
      });

      return () => {
        kill();
        subscription.unsubscribe();
      };
    });
  }
}
