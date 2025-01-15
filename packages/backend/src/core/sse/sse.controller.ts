import { AuthGuard } from '@/modules/auth/auth.guard';
import type { AppUrn } from '@/types/app/app.types';
import { Controller, type MessageEvent, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SSEService } from './sse.service';

@UseGuards(AuthGuard)
@Controller('sse')
export class SSEController {
  constructor(private readonly sseService: SSEService) {}

  @Sse('app')
  appEvents(): Observable<MessageEvent> {
    const observable = this.sseService.getTopicObservable('app');

    return observable;
  }

  @Sse('app-logs')
  @ApiQuery({ name: 'appUrn', type: String, required: true })
  @ApiQuery({ name: 'maxLines', type: Number, required: false })
  async appLogsEvents(@Query('appUrn') appUrn: AppUrn, @Query('maxLines') maxLines: number): Promise<Observable<MessageEvent>> {
    return this.sseService.getLogStreamObservable('app-logs', maxLines, appUrn);
  }

  @Sse('runtipi-logs')
  @ApiQuery({ name: 'maxLines', type: Number, required: false })
  async runtipiLogsEvents(@Query('maxLines') maxLines: number): Promise<Observable<MessageEvent>> {
    return this.sseService.getLogStreamObservable('runtipi-logs', maxLines);
  }
}
