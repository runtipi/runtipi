import { Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { Queue } from '../queue.entity';

export const systemCommandSchema = type({
  command: type.unit('sync_app_statuses'),
});

export const systemCommandResultSchema = type({
  success: 'boolean',
  message: 'string',
  syncedCount: 'number?',
  skippedCount: 'number?',
  errorCount: 'number?',
  totalApps: 'number?',
});

@Injectable()
export class SystemEventsQueue extends Queue<typeof systemCommandSchema, typeof systemCommandResultSchema> {}
