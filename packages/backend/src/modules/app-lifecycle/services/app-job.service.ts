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
type JobEntry = { job: AppJob; controller: AbortController; completion: Promise<void>; finish: () => void };

@Injectable()
export class AppJobService implements OnModuleDestroy {
  private readonly jobs = new Map<AppUrn, JobEntry>();
  private readonly history = new Map<string, AppJob>();
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
    this.pruneHistory();
    let job = this.jobs.get(appUrn)?.job;
    if (requestId && job?.requestId !== requestId) job = this.history.get(requestId);
    if (!job || job.appUrn !== appUrn) return null;

    return { ...job };
  }

  getCompletion(appUrn: AppUrn, requestId: string) {
    const entry = this.jobs.get(appUrn);
    if (entry?.job.requestId !== requestId) return undefined;

    return entry.completion;
  }

  isActive(appUrn: AppUrn) {
    const job = this.jobs.get(appUrn)?.job;

    return job?.status === 'queued' || job?.status === 'running' || job?.status === 'cancelling';
  }

  async onModuleDestroy() {
    this.closing = true;
    const entries = [...this.jobs].filter(([appUrn]) => this.isActive(appUrn));

    for (const [appUrn, entry] of entries) {
      if (entry.job.cancellable) this.cancel(appUrn, entry.job.requestId);
    }

    await Promise.all(entries.map(([, entry]) => entry.completion));
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

    let resolve!: () => void;
    const completion = new Promise<void>((done) => {
      resolve = done;
    });
    const entry: JobEntry = {
      job,
      controller: new AbortController(),
      completion,
      finish: () => {
        this.history.set(job.requestId, { ...job });
        this.pruneHistory();
        resolve();
      },
    };

    this.jobs.set(appUrn, entry);
    this.publish(appUrn);

    const progress = (phase: AppJob['phase']) => {
      job.phase = phase;
      job.updatedAt = Date.now();
      if (phase === 'recovering' || phase === 'restarting') job.cancellable = false;
      this.publish(appUrn);
    };

    void this.runTask(async () => {
      if (entry.controller.signal.aborted) return;

      try {
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
        entry.finish();
        this.publish(appUrn);
      }
    }).catch((error) => this.logger.error('Job notification failed', error));

    return { requestId: job.requestId };
  }

  private pruneHistory() {
    for (const [id, job] of this.history) {
      if (Date.now() - job.updatedAt > 60 * 60 * 1000) this.history.delete(id);
    }

    while (this.history.size > 1000) {
      const oldest = this.history.keys().next().value;
      if (oldest) this.history.delete(oldest);
    }
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
      entry.finish();
    }

    this.publish(appUrn);

    return { ...entry.job };
  }
}
