import { randomUUID } from 'node:crypto';
import { SSEService } from '@/core/sse/sse.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ConflictException, Injectable, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import type { AppJob } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { pLimit } from '@/common/helpers/file-helpers';

export type AppJobContext = {
  signal: AbortSignal;
  progress: (phase: AppJob['phase']) => void;
  disableCancellation: () => void;
};

type JobResult = { success: boolean; message: string; rollbackSucceeded?: boolean };
type JobEntry = { job: AppJob; controller: AbortController; completion?: Promise<void> };

@Injectable()
export class AppJobService implements OnModuleDestroy {
  private readonly jobs = new Map<AppUrn, JobEntry>();
  private readonly runTask = pLimit(3);
  private closing = false;

  constructor(
    private readonly logger: LoggerService,
    private readonly sse: SSEService,
  ) {}

  private publish(appUrn: AppUrn) {
    const job = this.getJob(appUrn);
    if (job) this.sse.emit('app', { event: 'job_progress', appUrn, job });
  }

  getJob(appUrn: AppUrn, requestId?: string) {
    const job = this.jobs.get(appUrn)?.job;
    if (!job || (requestId && job.requestId !== requestId)) return null;

    return { ...job };
  }

  isActive(appUrn: AppUrn) {
    const job = this.jobs.get(appUrn)?.job;

    return job?.status === 'queued' || job?.status === 'running' || job?.status === 'cancelling';
  }

  async onModuleDestroy() {
    this.closing = true;
    const entries = [...this.jobs].filter(([appUrn]) => this.isActive(appUrn)).map(([, entry]) => entry);

    for (const entry of entries) {
      if (entry.job.cancellable) entry.controller.abort(new Error('The server is shutting down'));
    }

    await Promise.all(entries.map((entry) => entry.completion));
  }

  assertIdle(appUrn: AppUrn) {
    if (this.isActive(appUrn)) {
      throw new ConflictException('This app already has an active job. Wait for it to finish or cancel it first.');
    }
  }

  submit(appUrn: AppUrn, command: AppJob['command'], task: (context: AppJobContext) => Promise<JobResult>) {
    if (this.closing) throw new ServiceUnavailableException('The server is shutting down.');

    this.assertIdle(appUrn);

    const now = Date.now();
    const job: AppJob = {
      requestId: randomUUID(),
      appUrn,
      command,
      status: 'queued',
      phase: 'queued',
      cancellable: true,
      startedAt: now,
      updatedAt: now,
      message: '',
    };
    const entry: JobEntry = { job, controller: new AbortController() };

    this.jobs.set(appUrn, entry);
    this.publish(appUrn);

    const progress = (phase: AppJob['phase']) => {
      job.phase = phase;
      job.updatedAt = Date.now();
      if (phase === 'recovering' || phase === 'restarting') job.cancellable = false;
      this.publish(appUrn);
    };

    entry.completion = this.runTask(async () => {
      try {
        if (entry.controller.signal.aborted) {
          job.status = 'cancelled';
          job.message = 'Job cancelled before it started';
          return;
        }

        job.status = 'running';
        progress('preparing');

        const result = await task({
          signal: entry.controller.signal,
          progress,
          disableCancellation: () => {
            entry.controller.signal.throwIfAborted();
            job.cancellable = false;
            this.publish(appUrn);
          },
        });

        if (result.success) {
          job.status = 'succeeded';
        } else if (entry.controller.signal.aborted && result.rollbackSucceeded === true) {
          job.status = 'cancelled';
        } else {
          job.status = 'failed';
        }

        job.message = result.message;
      } catch (error) {
        job.status = 'failed';
        job.message = error instanceof Error ? error.message : String(error);
        this.logger.error(`App ${appUrn} ${command} job failed:`, error);
      } finally {
        job.cancellable = false;
        job.phase = 'finished';
        job.updatedAt = Date.now();
        this.publish(appUrn);
      }
    });

    return { requestId: job.requestId };
  }

  cancel(appUrn: AppUrn, requestId: string) {
    const entry = this.jobs.get(appUrn);
    if (!this.isActive(appUrn) || !entry || entry.job.requestId !== requestId) {
      throw new ConflictException('This job is no longer active.');
    }

    if (!entry.job.cancellable) {
      throw new ConflictException('The deployment is being replaced or recovered. Wait for this job to finish.');
    }

    const queued = entry.job.status === 'queued';
    entry.job.status = queued ? 'cancelled' : 'cancelling';
    entry.job.updatedAt = Date.now();
    entry.controller.abort(new Error('Job cancelled'));

    if (queued) {
      entry.job.cancellable = false;
      entry.job.phase = 'finished';
      entry.job.message = 'Job cancelled before it started';
    }

    this.publish(appUrn);

    return { ...entry.job };
  }
}
