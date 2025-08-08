import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import type { SSE } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';

@Injectable()
export class AppNotifierService {
  constructor(
    private readonly sseService: SSEService,
    private readonly logger: LoggerService,
  ) {}

  notifyStatusChange(appUrn: AppUrn, appStatus: Extract<SSE, { topic: 'app' }>['data']['appStatus']) {
    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus });
    this.logger.info(`App ${appUrn} status change -> ${appStatus}`);
  }

  notifySuccess(event: Extract<SSE, { topic: 'app' }>['data']['event'], appUrn: AppUrn, payload?: Record<string, unknown>) {
    this.sseService.emit('app', { event, appUrn, ...(payload || {}) });
    this.logger.info(`App ${appUrn} ${event} ${payload ? JSON.stringify(payload) : ''}`);
  }

  notifyError(event: Extract<SSE, { topic: 'app' }>['data']['event'], appUrn: AppUrn, error: unknown, payload?: Record<string, unknown>) {
    this.sseService.emit('app', { event, appUrn, ...(payload || {}), error: typeof error === 'string' ? error : String(error) });
    this.logger.error(`App ${appUrn} ${event} - ${typeof error === 'string' ? error : String(error)}`);
  }
}
