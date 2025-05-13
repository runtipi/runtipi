import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Queue } from '../queue.entity.js';

const singleRepoCommandSchema = z.object({
  command: z.union([z.literal('clone'), z.literal('update')]),
  id: z.string(),
  url: z.string().url(),
});

const allReposCommandSchema = z.object({
  command: z.union([z.literal('update_all'), z.literal('clone_all')]),
});

export const repoCommandSchema = singleRepoCommandSchema.or(allReposCommandSchema);

export const repoCommandResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

@Injectable()
export class RepoEventsQueue extends Queue<typeof repoCommandSchema, typeof repoCommandResultSchema> {}
