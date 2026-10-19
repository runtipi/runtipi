import type { LoggerService } from '@/core/logger/logger.service';
import type { SSEService } from '@/core/sse/sse.service';
import { AsyncMutex } from '@/utils/mutex/async-mutex';
import type { ModuleRef } from '@nestjs/core';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppLifecycleCommandFactory } from '../app-lifecycle-command.factory';
import { AppJobService } from '../services/app-job.service';
import { AppMigrationService } from '../services/app-migration.service';
import { StartAppCommand } from '../commands/start-app-command';
import { UninstallAppCommand } from '../commands/uninstall-app-command';

test.each(['install', 'start', 'stop', 'restart', 'reset', 'generate_env', 'backup', 'restore', 'update'] as const)(
  'blocks %s when migration recovery cannot finish',
  async (command) => {
    const appUrn = 'demo:store' as AppUrn;
    const mutex = new AsyncMutex();
    const migrations = mock<AppMigrationService>();
    const moduleRef = mock<ModuleRef>();
    const factory = new AppLifecycleCommandFactory(moduleRef, mock<Dockerode>(), mutex, mock<AppJobService>(), migrations);
    migrations.reconcile.mockRejectedValue(new Error('recovery unavailable'));
    const context = { signal: new AbortController().signal, progress: vi.fn(), disableCancellation: vi.fn() };

    await expect(factory.execute({ appUrn, command, requestId: crypto.randomUUID(), form: {} } as never, context)).rejects.toThrow(
      'recovery unavailable',
    );
    expect(moduleRef.get).not.toHaveBeenCalled();
    expect(migrations.discardRecovery).not.toHaveBeenCalled();

    const release = await mutex.acquire(appUrn);
    release();
  },
);

test('continues uninstall after failed recovery only after stopping migration containers', async () => {
  const appUrn = 'demo:store' as AppUrn;
  const migrations = mock<AppMigrationService>();
  const factory = new AppLifecycleCommandFactory(mock<ModuleRef>(), mock<Dockerode>(), new AsyncMutex(), mock<AppJobService>(), migrations);
  const failure = new Error('recovery unavailable');
  migrations.reconcile.mockRejectedValue(failure);
  let discarded = false;
  migrations.discardRecovery.mockImplementation(async () => {
    discarded = true;
  });
  const execute = vi.spyOn(UninstallAppCommand.prototype, 'execute').mockImplementation(async () => {
    expect(discarded).toBe(true);
    return { success: true, message: 'uninstalled' };
  });

  try {
    await expect(factory.execute({ appUrn, command: 'uninstall', requestId: crypto.randomUUID(), form: {}, removeBackups: false })).resolves.toEqual({
      success: true,
      message: 'uninstalled',
    });
    expect(migrations.discardRecovery).toHaveBeenCalledWith(appUrn, failure);
  } finally {
    execute.mockRestore();
  }
});

test('blocks uninstall when migration containers cannot be stopped', async () => {
  const appUrn = 'demo:store' as AppUrn;
  const migrations = mock<AppMigrationService>();
  const moduleRef = mock<ModuleRef>();
  const mutex = new AsyncMutex();
  const factory = new AppLifecycleCommandFactory(moduleRef, mock<Dockerode>(), mutex, mock<AppJobService>(), migrations);
  migrations.reconcile.mockRejectedValue(new Error('recovery unavailable'));
  migrations.discardRecovery.mockRejectedValue(new Error('migration containers still running'));

  await expect(factory.execute({ appUrn, command: 'uninstall', requestId: crypto.randomUUID(), form: {}, removeBackups: false })).rejects.toThrow(
    'migration containers still running',
  );
  expect(moduleRef.get).not.toHaveBeenCalled();

  const release = await mutex.acquire(appUrn);
  release();
});

test('finishes migration recovery before executing the command', async () => {
  const appUrn = 'demo:store' as AppUrn;
  const migrations = mock<AppMigrationService>();
  const factory = new AppLifecycleCommandFactory(mock<ModuleRef>(), mock<Dockerode>(), new AsyncMutex(), mock<AppJobService>(), migrations);
  let recovered = false;
  migrations.reconcile.mockImplementation(async () => {
    recovered = true;
  });
  const execute = vi.spyOn(StartAppCommand.prototype, 'execute').mockImplementation(async () => {
    expect(recovered).toBe(true);
    return { success: true, message: 'done' };
  });

  try {
    await expect(factory.execute({ appUrn, command: 'start', requestId: crypto.randomUUID(), form: {} })).resolves.toEqual({
      success: true,
      message: 'done',
    });
    expect(migrations.reconcile).toHaveBeenCalledTimes(1);
  } finally {
    execute.mockRestore();
  }
});

test('rejects a conflicting command without waiting for the active job to release the app lock', async () => {
  const appUrn = 'demo:store' as AppUrn;
  const mutex = new AsyncMutex();
  const jobs = new AppJobService(mock<LoggerService>(), mock<SSEService>());
  const factory = new AppLifecycleCommandFactory(mock<ModuleRef>(), mock<Dockerode>(), mutex, jobs, mock<AppMigrationService>());
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
  const factory = new AppLifecycleCommandFactory(mock<ModuleRef>(), mock<Dockerode>(), mutex, jobs, mock<AppMigrationService>());
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
