import type { LoggerService } from '@/core/logger/logger.service';
import type { SSEService } from '@/core/sse/sse.service';
import { AsyncMutex } from '@/utils/mutex/async-mutex';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';
import { AppJobService } from './services/app-job.service';

test('rejects a conflicting command without waiting for the active job to release the app lock', async () => {
  const appUrn = 'demo:store' as AppUrn;
  const mutex = new AsyncMutex();
  const jobs = new AppJobService(mock<LoggerService>(), mock<SSEService>());
  const factory = new AppLifecycleCommandFactory(mock<ModuleRef>(), mock<Dockerode>(), mutex, jobs);
  const release = await mutex.acquire(appUrn);
  let finish: () => void = () => {};

  jobs.submit(appUrn, 'backup', async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });

    return { success: true, message: 'done' };
  });

  let rejection: unknown;
  const queued = factory.execute({ appUrn, command: 'stop', requestId: crypto.randomUUID(), form: {} }).catch((error) => {
    rejection = error;
  });

  try {
    await vi.waitFor(() => expect(rejection).toMatchObject({ status: 409 }), { timeout: 200 });
  } finally {
    finish();
    release();
    await jobs.onModuleDestroy();
    await queued;
  }
});

test('rejects a queued command if a background job was admitted while it waited for the app lock', async () => {
  const appUrn = 'demo:store' as AppUrn;
  const mutex = new AsyncMutex();
  const jobs = new AppJobService(mock<LoggerService>(), mock<SSEService>());
  const factory = new AppLifecycleCommandFactory(mock<ModuleRef>(), mock<Dockerode>(), mutex, jobs);
  const release = await mutex.acquire(appUrn);
  const queued = factory.execute({ appUrn, command: 'stop', requestId: crypto.randomUUID(), form: {} });
  let finish: () => void = () => {};

  jobs.submit(appUrn, 'backup', async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });

    return { success: true, message: 'done' };
  });

  release();
  await expect(queued).rejects.toThrow('active job');

  finish();
  await jobs.onModuleDestroy();
});
