import type { SSEService } from '@/core/sse/sse.service';
import { LoggerService } from '@/core/logger/logger.service';
import { createAppUrn } from '@/common/helpers/app-helpers';
import type { AppUrn } from '@runtipi/common/types';
import { afterEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppJobService } from './app-job.service';

const appUrn = 'demo:store' as AppUrn;

afterEach(() => vi.useRealTimers());

const createJobs = () => {
  const sse = mock<SSEService>();

  return { jobs: new AppJobService(mock<LoggerService>(), sse), sse };
};

const gate = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

test('a job stays active after the old RPC and watchdog timeouts have elapsed', async () => {
  const { jobs } = createJobs();
  const work = gate();
  const request = jobs.submit(appUrn, 'update', async () => {
    await work.promise;
    return { success: true, message: 'updated' };
  });

  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 30 * 60 * 1000);

  expect(jobs.getJob(appUrn, request.requestId)?.status).toBe('running');
  expect(jobs.isActive(appUrn)).toBe(true);

  vi.useRealTimers();
  work.resolve();
  await vi.waitFor(() => expect(jobs.getJob(appUrn)?.status).toBe('succeeded'));
});

test('rejects all concurrent requests instead of silently reusing different update options', async () => {
  const { jobs } = createJobs();
  const work = gate();
  const task = vi.fn(async () => {
    await work.promise;
    return { success: true, message: 'updated' };
  });

  const request = jobs.submit(appUrn, 'update', task);

  expect(() => jobs.submit(appUrn, 'update', task)).toThrow('active job');
  expect(() => jobs.submit(appUrn, 'backup', task)).toThrow('active job');
  expect(() => jobs.assertIdle(appUrn)).toThrow('active job');
  expect(task).toHaveBeenCalledTimes(1);

  work.resolve();
  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));
  expect(jobs.getJob(appUrn, request.requestId)?.status).toBe('succeeded');
});

test('cancellation remains active until backup cleanup and app recovery finish', async () => {
  const { jobs } = createJobs();
  const recovery = gate();
  const request = jobs.submit(appUrn, 'backup', async (context) => {
    context.progress('copying');
    await new Promise<void>((resolve) => context.signal.addEventListener('abort', () => resolve(), { once: true }));
    context.progress('recovering');
    await recovery.promise;

    return { success: false, rollbackSucceeded: true, message: 'Job cancelled' };
  });

  expect(jobs.cancel(appUrn, request.requestId).status).toBe('cancelling');
  await Promise.resolve();

  expect(jobs.isActive(appUrn)).toBe(true);
  expect(jobs.getJob(appUrn)).toMatchObject({ phase: 'recovering', cancellable: false });

  recovery.resolve();
  await vi.waitFor(() => expect(jobs.getJob(appUrn)?.status).toBe('cancelled'));
  expect(jobs.isActive(appUrn)).toBe(false);
});

test('a failed recovery is reported as failed even when cancellation was requested', async () => {
  const { jobs } = createJobs();
  const recovery = gate();
  const request = jobs.submit(appUrn, 'update', async () => {
    await recovery.promise;
    return { success: false, rollbackSucceeded: false, message: 'Previous app could not be restarted' };
  });

  jobs.cancel(appUrn, request.requestId);
  recovery.resolve();

  await vi.waitFor(() => expect(jobs.getJob(appUrn)?.status).toBe('failed'));
  expect(jobs.getJob(appUrn)?.message).toContain('could not be restarted');
});

test('deployment replacement cannot be cancelled midway through', async () => {
  const { jobs } = createJobs();
  const work = gate();
  const request = jobs.submit(appUrn, 'update', async (context) => {
    context.disableCancellation();
    context.progress('updating');
    await work.promise;

    return { success: true, message: 'updated' };
  });

  expect(() => jobs.cancel(appUrn, request.requestId)).toThrow('being replaced');
  expect(jobs.getJob(appUrn)?.status).toBe('running');

  work.resolve();
  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));
});

test('queued cancellation does not run the job or release a replacement job for the same app', async () => {
  const { jobs, sse } = createJobs();
  const running = gate();
  const task = vi.fn(async () => {
    await running.promise;
    return { success: true, message: 'done' };
  });

  for (const name of ['first', 'second', 'third']) jobs.submit(createAppUrn(name, 'store'), 'backup', task);

  const queued = jobs.submit(appUrn, 'backup', task);
  expect(jobs.getJob(appUrn)?.status).toBe('queued');
  jobs.cancel(appUrn, queued.requestId);
  expect(jobs.isActive(appUrn)).toBe(false);

  const replacement = gate();
  const next = jobs.submit(appUrn, 'backup', async () => {
    await replacement.promise;
    return { success: true, message: 'replacement completed' };
  });

  running.resolve();
  await vi.waitFor(() => expect(jobs.getJob(appUrn)?.status).toBe('running'));

  expect(task).toHaveBeenCalledTimes(3);
  expect(jobs.getJob(appUrn)?.requestId).toBe(next.requestId);
  expect(jobs.getJob(appUrn, queued.requestId)).toBeNull();
  expect(sse.emit).toHaveBeenLastCalledWith('app', {
    event: 'job_progress',
    appUrn,
    job: expect.objectContaining({ requestId: next.requestId, status: 'running' }),
  });

  replacement.resolve();
  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));
});

test('retains the latest result per app and rejects replaced request IDs', async () => {
  const { jobs } = createJobs();
  const task = async () => ({ success: true, message: 'done' });
  const first = jobs.submit(appUrn, 'backup', task);
  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));

  const second = jobs.submit(appUrn, 'backup', task);
  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));

  expect(jobs.getJob(appUrn)?.requestId).toBe(second.requestId);
  expect(jobs.getJob(appUrn, first.requestId)).toBeNull();
  expect(jobs.getJob('another:store' as AppUrn, first.requestId)).toBeNull();
  expect(new AppJobService(mock<LoggerService>(), mock<SSEService>()).getJob(appUrn)).toBeNull();
});

test('shutdown cancels work and waits for app recovery', async () => {
  const { jobs } = createJobs();
  const recovery = gate();
  let aborted = false;

  jobs.submit(appUrn, 'backup', async (context) => {
    await new Promise<void>((resolve) =>
      context.signal.addEventListener(
        'abort',
        () => {
          aborted = true;
          resolve();
        },
        { once: true },
      ),
    );
    await recovery.promise;

    return { success: false, rollbackSucceeded: true, message: 'Shutting down' };
  });

  const shutdown = jobs.onModuleDestroy();

  expect(aborted).toBe(true);
  expect(jobs.isActive(appUrn)).toBe(true);
  expect(() => jobs.submit(createAppUrn('another', 'store'), 'backup', vi.fn())).toThrow('shutting down');

  recovery.resolve();
  await shutdown;

  expect(jobs.getJob(appUrn)?.status).toBe('cancelled');
  expect(jobs.isActive(appUrn)).toBe(false);
});

test('shutdown waits for a deployment that has already passed the cancellation boundary', async () => {
  const { jobs } = createJobs();
  const deployment = gate();
  let signal: AbortSignal | undefined;

  jobs.submit(appUrn, 'update', async (context) => {
    signal = context.signal;
    context.disableCancellation();
    await deployment.promise;

    return { success: true, message: 'Updated' };
  });

  const shutdown = jobs.onModuleDestroy();

  expect(signal?.aborted).toBe(false);
  expect(jobs.isActive(appUrn)).toBe(true);

  deployment.resolve();
  await shutdown;

  expect(jobs.getJob(appUrn)?.status).toBe('succeeded');
});

test('streams current progress and completion through the app event channel', async () => {
  const sse = mock<SSEService>();
  const jobs = new AppJobService(mock<LoggerService>(), sse);
  const work = gate();
  const request = jobs.submit(appUrn, 'backup', async (context) => {
    context.progress('archiving');
    await work.promise;

    return { success: true, message: 'done' };
  });

  expect(sse.emit).toHaveBeenLastCalledWith('app', {
    event: 'job_progress',
    appUrn,
    job: expect.objectContaining({ requestId: request.requestId, status: 'running', phase: 'archiving' }),
  });

  work.resolve();
  await vi.waitFor(() => expect(jobs.getJob(appUrn)?.status).toBe('succeeded'));

  expect(sse.emit).toHaveBeenLastCalledWith('app', { event: 'job_progress', appUrn, job: jobs.getJob(appUrn) });
});
