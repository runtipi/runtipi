import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { createAppUrn } from '@/common/helpers/app-helpers';
import { AppsService } from '@/modules/apps/apps.service';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { AppEventsQueue } from '@/modules/queue/entities/app-events';
import { AppLifecycleService } from '../app-lifecycle.service';
import { AppOperationsService } from '../services/app-operations.service';
import { AppJobService } from '../services/app-job.service';
import { StatusManagerService } from '../services/status-manager.service';
import { StartAppHandler } from '../handlers/start-app.handler';
import { StopAppHandler } from '../handlers/stop-app.handler';
import { RestartAppHandler } from '../handlers/restart-app.handler';

const setup = async () => {
  const repository = mock<AppsRepository>();
  const files = mock<AppFilesManager>();
  const marketplace = mock<MarketplaceService>();
  const queue = mock<AppEventsQueue>();
  const module = await Test.createTestingModule({
    providers: [
      AppLifecycleService,
      AppsService,
      AppOperationsService,
      AppJobService,
      StatusManagerService,
      StartAppHandler,
      StopAppHandler,
      RestartAppHandler,
      { provide: AppsRepository, useValue: repository },
      { provide: AppFilesManager, useValue: files },
      { provide: MarketplaceService, useValue: marketplace },
      { provide: AppEventsQueue, useValue: queue },
    ],
  })
    .useMocker(() => mock())
    .compile();
  const rows = [
    fromPartial<Awaited<ReturnType<AppsRepository['getApps']>>[number]>({
      id: 1,
      appName: 'stopped',
      appStoreSlug: 'store',
      status: 'stopped',
      config: { APP_KEY: 'saved' },
    }),
    fromPartial<Awaited<ReturnType<AppsRepository['getApps']>>[number]>({
      id: 2,
      appName: 'running',
      appStoreSlug: 'store',
      status: 'running',
      config: {},
    }),
  ];
  repository.getApps.mockResolvedValue(rows);
  repository.getAppByUrn.mockImplementation(async (urn: string) => rows.find((app) => createAppUrn(app.appName, app.appStoreSlug) === urn));
  files.getInstalledAppInfo.mockImplementation(async (urn) => fromPartial({ urn, name: urn }));
  marketplace.getAppUpdateInfo.mockResolvedValue(fromPartial({ latestVersion: 1 }));
  queue.publish.mockResolvedValue({ success: true, message: 'Completed' });
  return { service: module.get(AppLifecycleService), operations: module.get(AppOperationsService), queue };
};

test('bulk start selects stopped apps and preserves the shared skip-pull policy', async () => {
  const { service, operations, queue } = await setup();

  const results = await service.startAllApps();

  expect(results).toHaveLength(1);
  const result = results[0];
  expect(result).toMatchObject({ urn: 'stopped:store', status: 'accepted' });
  if (!result || result.status !== 'accepted') throw new Error('Expected an accepted bulk operation');
  await operations.waitFor(result.requestId);
  expect(queue.publish).toHaveBeenCalledWith(
    expect.objectContaining({ appUrn: 'stopped:store', command: 'start', form: { APP_KEY: 'saved', skipPull: true } }),
  );
});

test.each(['stop', 'restart'] as const)('bulk %s selects running apps and reports correlated requests', async (command) => {
  const { service, operations, queue } = await setup();

  const results = await service.runBulk(command);

  expect(results).toHaveLength(1);
  const result = results[0];
  expect(result).toMatchObject({ urn: 'running:store', status: 'accepted' });
  if (!result || result.status !== 'accepted') throw new Error('Expected an accepted bulk operation');
  await operations.waitFor(result.requestId);
  expect(queue.publish).toHaveBeenCalledWith(expect.objectContaining({ appUrn: 'running:store', command, requestId: result.requestId }));
});

test('bulk submission reports an active app rejection instead of enqueueing overlapping work', async () => {
  const { service, operations, queue } = await setup();
  operations.submit(createAppUrn('stopped', 'store'), 'start', crypto.randomUUID(), () => new Promise(() => {}));

  const results = await service.startAllApps();

  expect(results).toEqual([{ urn: 'stopped:store', status: 'rejected', message: 'This app already has an active lifecycle operation' }]);
  expect(queue.publish).not.toHaveBeenCalled();
});
