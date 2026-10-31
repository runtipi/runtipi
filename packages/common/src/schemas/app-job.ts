import { type } from 'arktype';

export const appJobSchema = type({
  requestId: 'string.uuid',
  appUrn: 'string',
  command: "'backup' | 'update'",
  status: "'queued' | 'running' | 'cancelling' | 'succeeded' | 'failed' | 'cancelled'",
  phase: "'queued' | 'preparing' | 'stopping' | 'copying' | 'archiving' | 'saving' | 'updating' | 'recovering' | 'restarting' | 'finished'",
  cancellable: 'boolean',
  startedAt: 'number',
  updatedAt: 'number',
  message: 'string',
});

export type AppJob = typeof appJobSchema.infer;
