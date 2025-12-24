import { Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { Queue } from '../queue.entity';

const singleRepoCommandSchema = type({
  command: type("'clone' | 'update'"),
  id: 'string',
  url: 'string.url',
});

const allReposCommandSchema = type({
  command: type("'update_all' | 'clone_all'"),
});

export const repoCommandSchema = type.or(singleRepoCommandSchema, allReposCommandSchema);

export const repoCommandResultSchema = type({
  success: 'boolean',
  message: 'string',
});

@Injectable()
export class RepoEventsQueue extends Queue<typeof repoCommandSchema, typeof repoCommandResultSchema> {}
