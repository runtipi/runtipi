import { castAppUrn } from '@/common/helpers/app-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppJobService } from '../services/app-job.service';
import { AppOperationsService } from '../services/app-operations.service';

test('releases a cancelled queued job without waiting for unrelated running jobs', async () => {
  const logger = mock<LoggerService>();
  const jobs = new AppJobService(logger, mock<SSEService>());
  const operations = new AppOperationsService(jobs, logger);
  let release!: () => void;
  const work = new Promise<void>((resolve) => {
    release = resolve;
  });
  const blockers = Array.from({ length: 3 }, (_, index) => {
    const urn = castAppUrn(`blocker-${index}:store`);
    const request = jobs.submit(urn, 'backup', async () => {
      await work;
      return { success: true, message: 'Done' };
    });
    return jobs.getCompletion(urn, request.requestId);
  });
  const urn = castAppUrn('queued:store');
  const execute = vi.fn();
  try {
    const request = await operations.admit(urn, async () => jobs.submit(urn, 'backup', execute));
    expect(operations.get(urn, request.requestId)).toMatchObject({ status: 'queued' });
    operations.cancel(urn, request.requestId);
    await jobs.getCompletion(urn, request.requestId);

    await expect(operations.admit(urn, async () => undefined)).resolves.toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  } finally {
    release();
    await Promise.all(blockers);
  }
});

test('retains a completed job while its replacement is running', async () => {
  const logger = mock<LoggerService>();
  const jobs = new AppJobService(logger, mock<SSEService>());
  const operations = new AppOperationsService(jobs, logger);
  const urn = castAppUrn('demo:store');
  const first = await operations.admit(urn, async () => jobs.submit(urn, 'backup', async () => ({ success: true, message: 'First backup' })));
  await jobs.getCompletion(urn, first.requestId);
  let release!: () => void;
  const work = new Promise<void>((resolve) => {
    release = resolve;
  });
  const second = await operations.admit(urn, async () =>
    jobs.submit(urn, 'backup', async () => {
      await work;
      return { success: true, message: 'Second backup' };
    }),
  );
  try {
    expect(operations.get(urn, first.requestId)).toMatchObject({ status: 'succeeded', message: 'First backup' });
    expect(operations.get(urn, second.requestId)).toMatchObject({ status: 'running' });
  } finally {
    release();
    await jobs.getCompletion(urn, second.requestId);
  }
});

test('shutdown settles queued cancellations and waits for running work to finish', async () => {
  const jobs = new AppJobService(mock<LoggerService>(), mock<SSEService>());
  let release!: () => void;
  const work = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = Promise.withResolvers<void>();
  let running = 0;
  for (let index = 0; index < 3; index++) {
    jobs.submit(castAppUrn(`active-${index}:store`), 'backup', async () => {
      if (++running === 3) started.resolve();
      await work;
      return { success: true, message: 'Done' };
    });
  }
  await started.promise;

  const urn = castAppUrn('queued:store');
  const execute = vi.fn();
  const queued = jobs.submit(urn, 'backup', execute);
  const settled = vi.fn();
  const shutdown = jobs.onModuleDestroy().then(settled);
  try {
    expect(jobs.getJob(urn, queued.requestId)).toMatchObject({ status: 'cancelled' });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(settled).not.toHaveBeenCalled();
  } finally {
    release();
    await shutdown;
  }
  expect(settled).toHaveBeenCalledOnce();
  await expect(jobs.getCompletion(urn, queued.requestId)).resolves.toBeUndefined();
  expect(execute).not.toHaveBeenCalled();
});
