import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Queue } from '../queue.entity';

export const systemCommandSchema = z.object({
  command: z.literal('sync_app_statuses'),
});

export const systemCommandResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  syncedCount: z.number().optional(),
  skippedCount: z.number().optional(),
  errorCount: z.number().optional(),
  totalApps: z.number().optional(),
});

@Injectable()
export class SystemEventsQueue extends Queue<typeof systemCommandSchema, typeof systemCommandResultSchema> {}
