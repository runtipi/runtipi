import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { AppEventsQueue } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { StatusManagerService } from '../services/status-manager.service';
import { UpdateAppHandler } from './update-app.handler';
import { UpdateConfigHandler } from './update-config.handler';

const appUrn = 'app:test' as AppUrn;

type StoredApp = NonNullable<Awaited<ReturnType<AppsRepository['getAppByUrn']>>>;
type PublishResult = Awaited<ReturnType<AppEventsQueue['publish']>>;

const waitForQueueResult = async () => new Promise((resolve) => setTimeout(resolve, 0));

const createHandler = (options: { initialStatus?: StoredApp['status']; publishResult?: PublishResult } = {}) => {
  const logger = mock<LoggerService>();
  const appRepository = mock<AppsRepository>();
  const appEventsQueue = mock<AppEventsQueue>();
  const statusManager = mock<StatusManagerService>();
  const config = mock<ConfigurationService>();
  const marketplaceService = mock<MarketplaceService>();
  const appFilesManager = mock<AppFilesManager>();
  const updateConfigHandler = mock<UpdateConfigHandler>();
  const initialStatus = options.initialStatus ?? 'running';
  const publishResult = options.publishResult ?? { success: true, message: 'updated' };
  const app = { id: 1, status: initialStatus, config: {}, version: 1 } as StoredApp;

  appRepository.getAppByUrn.mockResolvedValue(app);
  config.get.calledWith('version').mockReturnValue('3.0.0' as never);
  marketplaceService.getAppUpdateInfo.mockResolvedValue({ minTipiVersion: null } as Awaited<ReturnType<MarketplaceService['getAppUpdateInfo']>>);
  appEventsQueue.publish.mockResolvedValue(publishResult);
  updateConfigHandler.execute.mockResolvedValue({ requestId: 'request-id' });

  const handler = new UpdateAppHandler(
    logger,
    appRepository,
    appEventsQueue,
    statusManager,
    config,
    marketplaceService,
    appFilesManager,
    updateConfigHandler,
  );

  return { handler, logger, appRepository, appEventsQueue, statusManager, appFilesManager, updateConfigHandler };
};

test('preserves the previous running status when the update command fails', async () => {
  const publishResult = { success: false, message: 'registry unavailable', rollbackSucceeded: true } as const;
  const { handler, appEventsQueue, appRepository } = createHandler({ publishResult });

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(appEventsQueue.publish).toHaveBeenCalledWith(
    expect.objectContaining({ command: 'update', appUrn, performBackup: true, wasRunningBeforeUpdate: true }),
  );
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'running' });
  expect(appRepository.updateAppById).not.toHaveBeenCalledWith(1, { status: 'stopped' });
});

test.each(['app.env could not be read', 'staging directory could not be created'])(
  'keeps a running app running when update setup fails: %s',
  async (message) => {
    const publishResult = { success: false, message, rollbackSucceeded: true } as const;
    const { handler, appRepository } = createHandler({ publishResult });

    await handler.execute(appUrn, { performBackup: true });
    await waitForQueueResult();

    expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'running' });
  },
);

test('keeps the app stopped when rollback did not restore the previous deployment', async () => {
  const publishResult = {
    success: false,
    message: 'target failed. Recovery failed; the previous app files are retained at /tmp/runtipi-update-abc.',
    rollbackSucceeded: false,
    recoverySnapshotPath: '/tmp/runtipi-update-abc',
  } as const;
  const { handler, statusManager, appRepository } = createHandler({ publishResult });

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(statusManager.emitEvent).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'update_error', error: expect.stringContaining('/tmp/runtipi-update-abc') }),
  );
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'stopped' });
});

test('restores the previous status when publishing the update fails', async () => {
  const { handler, logger, appRepository, appEventsQueue, statusManager } = createHandler();
  appEventsQueue.publish.mockRejectedValue(new Error('queue unavailable'));

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('queue unavailable'));
  expect(statusManager.emitEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'update_error', error: 'queue unavailable' }));
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'running' });
});

test('preserves the rollback status when processing a failed update result rejects', async () => {
  const publishResult = { success: false, message: 'deployment failed', rollbackSucceeded: false } as const;
  const { handler, appRepository } = createHandler({ publishResult });
  appRepository.updateAppById.mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue({} as StoredApp);

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'stopped' });
});

test('starts a successful update without pulling the same images again', async () => {
  const { handler, statusManager, appFilesManager } = createHandler();
  appFilesManager.getInstalledAppInfo.mockResolvedValue({ tipi_version: 2 } as Awaited<ReturnType<AppFilesManager['getInstalledAppInfo']>>);

  await handler.execute(appUrn, { performBackup: false });
  await waitForQueueResult();

  expect(statusManager.emitSuccess).toHaveBeenCalledWith(expect.objectContaining({ appId: 1, appUrn, event: 'update_success', status: 'running' }));
});

test('preserves the stored version when installed app info is unavailable', async () => {
  const { handler, appRepository, appFilesManager } = createHandler();
  appFilesManager.getInstalledAppInfo.mockResolvedValue(null);

  await handler.execute(appUrn, { performBackup: false });
  await waitForQueueResult();

  expect(appRepository.updateAppById).toHaveBeenCalledWith(1, { version: 1 });
});
