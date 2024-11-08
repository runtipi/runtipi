import { Injectable } from '@nestjs/common';
import { Queue } from '../queue.entity';
import { z } from 'zod';

export const repoCommandSchema = z.object({
  command: z.union([z.literal('clone'), z.literal('update')]),
  url: z.string().url(),
});

export const repoCommandResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

@Injectable()
export class RepoEventsQueue extends Queue<typeof repoCommandSchema, typeof repoCommandResultSchema> { }
