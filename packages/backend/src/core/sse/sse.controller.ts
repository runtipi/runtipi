import { castAppUrn } from '@/common/helpers/app-helpers';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { Controller, type MessageEvent, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import type { StreamAppLogsQueryDto, StreamRuntipiLogsQueryDto } from './dto/sse.dto';
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
  async appLogsEvents(@Query() query: StreamAppLogsQueryDto): Promise<Observable<MessageEvent>> {
    const { appUrn, maxLines = 300 } = query;

    return this.sseService.getLogStreamObservable('app-logs', maxLines, castAppUrn(appUrn));
  }

  @Sse('runtipi-logs')
  @ApiQuery({ name: 'maxLines', type: Number, required: false })
  async runtipiLogsEvents(@Query() query: StreamRuntipiLogsQueryDto): Promise<Observable<MessageEvent>> {
    const { maxLines = 300 } = query;

    return this.sseService.getLogStreamObservable('runtipi-logs', maxLines);
  }
}
