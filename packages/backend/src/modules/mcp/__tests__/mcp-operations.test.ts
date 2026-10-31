import { RestoreAppHandler } from '@/modules/app-lifecycle/handlers/restore-app.handler';
import { InstallAppHandler } from '@/modules/app-lifecycle/handlers/install-app.handler';
import { AppValidationService } from '@/modules/app-lifecycle/services/app-validation.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { randomUUID } from 'node:crypto';
import { fromPartial } from '@total-typescript/shoehorn';
import { afterEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { SSEService } from '@/core/sse/sse.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppEventsQueue } from '@/modules/queue/entities/app-events';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { AppOperationsService, type OperationResult } from '@/modules/app-lifecycle/services/app-operations.service';
import { StatusManagerService } from '@/modules/app-lifecycle/services/status-manager.service';
import { StopAppHandler } from '@/modules/app-lifecycle/handlers/stop-app.handler';
import { StartAppHandler } from '@/modules/app-lifecycle/handlers/start-app.handler';
import { ResetAppHandler } from '@/modules/app-lifecycle/handlers/reset-app.handler';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { McpOperationsService } from '../mcp-operations.service';

const urn = castAppUrn('demo:store');
const identity = fromPartial<AgentIdentity>({ user: { id: 42 }, credentialId: 'agent' });
const deferred = () => {
  let resolve!: (result: OperationResult) => void;
  const promise = new Promise<OperationResult>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};
const setup = () => {
  const logger = mock<LoggerService>();
  const sse = mock<SSEService>();
  const jobs = new AppJobService(logger, sse);
  const lifecycle = new AppOperationsService(jobs, logger);
  const operations = new McpOperationsService(lifecycle);
  const repository = mock<AppsRepository>();
  repository.getAppByUrn.mockResolvedValue(fromPartial({ id: 1, status: 'running', config: {} }));
  const queue = mock<AppEventsQueue>();
  const status = new StatusManagerService(repository, sse, logger);
  const stop = new StopAppHandler(repository, queue, status, lifecycle);
  const start = new StartAppHandler(repository, queue, status, lifecycle);
  const files = mock<AppFilesManager>();
  files.getInstalledAppInfo.mockResolvedValue(fromPartial({ tipi_version: 3 }));
  const restore = new RestoreAppHandler(repository, queue, status, files, start, lifecycle);
  const install = new InstallAppHandler(repository, queue, status, mock<AppValidationService>(), mock<MarketplaceService>(), start, lifecycle);
  const reset = new ResetAppHandler(repository, queue, status, start, lifecycle);
  return { operations, lifecycle, jobs, repository, queue, stop, start, reset, restore, install, sse };
};

afterEach(() => vi.useRealTimers());

test('dashboard work blocks the agent and an old SSE event cannot complete its later request', async () => {
  const { operations, lifecycle, queue, stop, sse } = setup();
  const dashboard = deferred();
  const agent = deferred();
  queue.publish.mockReturnValueOnce(dashboard.promise).mockReturnValueOnce(agent.promise);
  const dashboardRequest = await lifecycle.admit(urn, () => stop.execute(urn));

  await expect(operations.start(identity, urn, 'stop', () => lifecycle.admit(urn, () => stop.execute(urn)))).rejects.toThrow(
    'active lifecycle operation',
  );
  dashboard.resolve({ success: true, message: 'Dashboard stop completed' });
  await lifecycle.waitFor(dashboardRequest.requestId);
  const tracked = await operations.start(identity, urn, 'stop', () => lifecycle.admit(urn, () => stop.execute(urn)));

  sse.emit('app', { event: 'stop_success', appUrn: urn });
  expect(operations.get(42, tracked.operationId)).toMatchObject({ status: 'running', phase: 'stop', requestId: tracked.requestId });

  agent.resolve({ success: true, message: 'Agent stop completed' });
  await lifecycle.waitFor(tracked.requestId);
  expect(operations.get(42, tracked.operationId)).toMatchObject({ status: 'succeeded', phase: 'finished', message: 'Agent stop completed' });
});

test('completion waits for database post-processing and reports its failure', async () => {
  const { operations, lifecycle, queue, stop, repository } = setup();
  const work = deferred();
  queue.publish.mockReturnValue(work.promise);
  const tracked = await operations.start(identity, urn, 'stop', () => stop.execute(urn));
  repository.updateAppById.mockRejectedValueOnce(new Error('Database unavailable'));

  work.resolve({ success: true, message: 'Container stopped' });
  await lifecycle.waitFor(tracked.requestId);

  expect(operations.get(42, tracked.operationId)).toMatchObject({ status: 'failed', phase: 'finished' });
});

test.each(['reset', 'restore'] as const)('%s waits for its own follow-up start and propagates that start failure', async (command) => {
  const { operations, lifecycle, queue, reset, restore } = setup();
  const resetting = deferred();
  const starting = deferred();
  queue.publish.mockReturnValueOnce(resetting.promise).mockReturnValueOnce(starting.promise);
  const tracked = await operations.start(identity, urn, command, () =>
    lifecycle.admit(urn, () => {
      if (command === 'reset') return reset.execute(urn);
      return restore.execute(urn, { filename: 'backup.tar.gz' });
    }),
  );

  resetting.resolve({ success: true, message: 'Data reset' });
  await vi.waitFor(() => expect(queue.publish).toHaveBeenCalledTimes(2));
  expect(operations.get(42, tracked.operationId)).toMatchObject({ status: 'running', phase: 'starting' });
  await expect(lifecycle.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');

  starting.resolve({ success: false, message: 'Start failed' });
  await lifecycle.waitFor(tracked.requestId);
  expect(operations.get(42, tracked.operationId)).toMatchObject({ status: 'failed', message: 'Start failed' });
});

test('restricts operation lookup and cancellation to the owner', async () => {
  const { operations, queue, stop } = setup();
  queue.publish.mockReturnValue(deferred().promise);
  const tracked = await operations.start(identity, urn, 'stop', () => stop.execute(urn));

  expect(() => operations.get(1, tracked.operationId)).toThrow('unknown or expired');
  expect(() => operations.cancel(1, tracked.operationId)).toThrow('unknown or expired');
  expect(() => operations.cancel(42, tracked.operationId)).toThrow('cannot currently be cancelled');
});

test('prevents overlapping submissions and releases the app after failure', async () => {
  const { operations, lifecycle, queue, stop } = setup();
  const first = deferred();
  queue.publish.mockReturnValueOnce(first.promise).mockResolvedValue({ success: true, message: 'Stopped' });
  const tracked = await operations.start(identity, urn, 'stop', () => lifecycle.admit(urn, () => stop.execute(urn)));

  await expect(operations.start(identity, urn, 'stop', () => lifecycle.admit(urn, () => stop.execute(urn)))).rejects.toThrow(
    'active lifecycle operation',
  );
  first.resolve({ success: false, message: 'Failed' });
  await lifecycle.waitFor(tracked.requestId);
  await expect(operations.start(identity, urn, 'stop', () => lifecycle.admit(urn, () => stop.execute(urn)))).resolves.toHaveProperty('operationId');
});

test('keeps active work queryable and expires completed history after one hour', async () => {
  vi.useFakeTimers();
  const { operations, lifecycle, queue, stop } = setup();
  const work = deferred();
  queue.publish.mockReturnValue(work.promise);
  const tracked = await operations.start(identity, urn, 'stop', () => stop.execute(urn));
  vi.setSystemTime(Date.now() + 3600001);
  expect(operations.get(42, tracked.operationId).status).toBe('running');

  work.resolve({ success: true, message: 'Stopped' });
  await lifecycle.waitFor(tracked.requestId);
  vi.setSystemTime(Date.now() + 3600001);
  expect(() => operations.get(42, tracked.operationId)).toThrow('unknown or expired');
});

test('projects update and backup progress and cancellation from the canonical job service', async () => {
  const { operations, lifecycle, jobs } = setup();
  const work = deferred();
  const tracked = await operations.start(identity, urn, 'backup', () =>
    lifecycle.admit(urn, async () => jobs.submit(urn, 'backup', async () => work.promise)),
  );
  await vi.waitFor(() => expect(operations.get(42, tracked.operationId).status).toBe('running'));

  expect(operations.get(42, tracked.operationId)).toMatchObject({ phase: 'preparing', cancellable: true });
  await expect(lifecycle.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');
  expect(operations.cancel(42, tracked.operationId).status).toBe('cancelling');
  const cancelled = { success: false, message: 'Cancelled', rollbackSucceeded: true };
  work.resolve(cancelled);
  await jobs.getCompletion(urn, tracked.requestId);
  expect(operations.get(42, tracked.operationId).status).toBe('cancelled');
  await expect(lifecycle.admit(urn, async () => undefined)).resolves.toBeUndefined();
});

test('does not assume an untracked request completed successfully', async () => {
  const { operations } = setup();
  const tracked = await operations.start(identity, urn, 'install', async () => ({ requestId: randomUUID() }));

  expect(tracked.status).toBe('unknown');
  expect(() => operations.get(42, tracked.operationId)).toThrow('unknown or expired');
});

test('reinstall tracks the actual delegated start without guessing a completion event', async () => {
  const { operations, lifecycle, queue, install } = setup();
  const work = deferred();
  queue.publish.mockReturnValue(work.promise);

  const tracked = await operations.start(identity, urn, 'install', () => install.execute(urn, { form: {} }));
  expect(queue.publish).toHaveBeenCalledWith(expect.objectContaining({ command: 'start', requestId: tracked.requestId }));

  work.resolve({ success: true, message: 'Started' });
  await lifecycle.waitFor(tracked.requestId);
  expect(operations.get(42, tracked.operationId)).toMatchObject({ status: 'succeeded', command: 'install' });
});
