import type { ConfigurationService } from '@/core/config/configuration.service';
import type { LoggerService } from '@/core/logger/logger.service';
import type { SSEService } from '@/core/sse/sse.service';
import type { AppsRepository } from '@/modules/apps/apps.repository';
import type { SystemEventsQueue } from '@/modules/queue/entities/system-events';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import type Dockerode from 'dockerode';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppStatusSyncService } from './app-status-sync.service';
import { AppJobService } from './services/app-job.service';

const appUrn = 'demo:store' as AppUrn;

const setup = (jobs: AppJobService, updatedAt: number) => {
  const logger = mock<LoggerService>();
  const repository = mock<AppsRepository>();
  const sse = mock<SSEService>();
  const config = mock<ConfigurationService>();
  const docker = mock<Dockerode>();

  repository.getApps.mockResolvedValue([fromPartial({ id: 1, appName: 'demo', appStoreSlug: 'store', status: 'updating', updatedAt })]);
  config.get.calledWith('userSettings').mockReturnValue(fromPartial({ eventsTimeout: 5 }));
  docker.listContainers.mockResolvedValue([]);

  return { service: new AppStatusSyncService(logger, repository, sse, mock<SystemEventsQueue>(), config, docker, jobs), repository, sse };
};

test('the watchdog does not report a stopped app while its long-running job is active', async () => {
  const jobs = new AppJobService(mock<LoggerService>(), mock<SSEService>());

  let finish: () => void = () => {};

  jobs.submit(appUrn, 'update', async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    return { success: true, message: 'updated' };
  });

  const { service, repository, sse } = setup(jobs, Math.floor(Date.now() / 1000) - 30 * 60);
  const result = await service.syncAllAppStatuses();

  expect(result).toMatchObject({ syncedCount: 0, skippedCount: 1 });
  expect(repository.updateAppById).not.toHaveBeenCalled();
  expect(sse.emit).not.toHaveBeenCalled();

  finish();
  await vi.waitFor(() => expect(jobs.isActive(appUrn)).toBe(false));
});

test('reconciles a stale transitional status after job state is lost on restart', async () => {
  const jobs = new AppJobService(mock<LoggerService>(), mock<SSEService>());
  const { service, repository } = setup(jobs, Math.floor(Date.now() / 1000) - 6 * 60);

  await service.syncAllAppStatuses();

  expect(repository.updateAppById).toHaveBeenCalledWith(1, { status: 'stopped' });
  expect(jobs.getJob(appUrn)).toBeNull();
});
