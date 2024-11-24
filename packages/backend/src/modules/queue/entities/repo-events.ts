import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Queue } from '../queue.entity';

export const repoCommandSchema = z.object({
  command: z.union([z.literal('clone'), z.literal('update'), z.literal('update_all')]),
  url: z.string().url(),
});

export const repoCommandResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

@Injectable()
export class RepoEventsQueue extends Queue<typeof repoCommandSchema, typeof repoCommandResultSchema> {}
