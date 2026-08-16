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

const waitForQueueResult = async () => new Promise((resolve) => setTimeout(resolve, 0));

test('preserves the previous running status when the update command fails', async () => {
  const logger = mock<LoggerService>();
  const appRepository = mock<AppsRepository>();
  const appEventsQueue = mock<AppEventsQueue>();
  const statusManager = mock<StatusManagerService>();
  const config = mock<ConfigurationService>();
  const marketplaceService = mock<MarketplaceService>();
  const appFilesManager = mock<AppFilesManager>();
  const updateConfigHandler = mock<UpdateConfigHandler>();

  appRepository.getAppByUrn.mockResolvedValue({ id: 1, status: 'running', config: {} } as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
  config.get.calledWith('version').mockReturnValue('3.0.0' as never);
  marketplaceService.getAppUpdateInfo.mockResolvedValue({ minTipiVersion: null } as Awaited<ReturnType<MarketplaceService['getAppUpdateInfo']>>);
  appEventsQueue.publish.mockResolvedValue({ success: false, message: 'registry unavailable', rollbackSucceeded: true });

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
    const logger = mock<LoggerService>();
    const appRepository = mock<AppsRepository>();
    const appEventsQueue = mock<AppEventsQueue>();
    const statusManager = mock<StatusManagerService>();
    const config = mock<ConfigurationService>();
    const marketplaceService = mock<MarketplaceService>();
    const appFilesManager = mock<AppFilesManager>();
    const updateConfigHandler = mock<UpdateConfigHandler>();

    appRepository.getAppByUrn.mockResolvedValue({ id: 1, status: 'running', config: {} } as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
    config.get.calledWith('version').mockReturnValue('3.0.0' as never);
    marketplaceService.getAppUpdateInfo.mockResolvedValue({ minTipiVersion: null } as Awaited<ReturnType<MarketplaceService['getAppUpdateInfo']>>);
    appEventsQueue.publish.mockResolvedValue({ success: false, message, rollbackSucceeded: true });

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

    await handler.execute(appUrn, { performBackup: true });
    await waitForQueueResult();

    expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'running' });
  },
);

test('keeps the app stopped when rollback did not restore the previous deployment', async () => {
  const logger = mock<LoggerService>();
  const appRepository = mock<AppsRepository>();
  const appEventsQueue = mock<AppEventsQueue>();
  const statusManager = mock<StatusManagerService>();
  const config = mock<ConfigurationService>();
  const marketplaceService = mock<MarketplaceService>();
  const appFilesManager = mock<AppFilesManager>();
  const updateConfigHandler = mock<UpdateConfigHandler>();

  appRepository.getAppByUrn.mockResolvedValue({ id: 1, status: 'running', config: {} } as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
  config.get.calledWith('version').mockReturnValue('3.0.0' as never);
  marketplaceService.getAppUpdateInfo.mockResolvedValue({ minTipiVersion: null } as Awaited<ReturnType<MarketplaceService['getAppUpdateInfo']>>);
  appEventsQueue.publish.mockResolvedValue({
    success: false,
    message: 'target failed. Recovery failed; the previous app files are retained at /tmp/runtipi-update-abc.',
    rollbackSucceeded: false,
    recoverySnapshotPath: '/tmp/runtipi-update-abc',
  });

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

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(statusManager.emitEvent).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'update_error', error: expect.stringContaining('/tmp/runtipi-update-abc') }),
  );
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'stopped' });
});

test('starts a successful update without pulling the same images again', async () => {
  const logger = mock<LoggerService>();
  const appRepository = mock<AppsRepository>();
  const appEventsQueue = mock<AppEventsQueue>();
  const statusManager = mock<StatusManagerService>();
  const config = mock<ConfigurationService>();
  const marketplaceService = mock<MarketplaceService>();
  const appFilesManager = mock<AppFilesManager>();
  const updateConfigHandler = mock<UpdateConfigHandler>();

  appRepository.getAppByUrn.mockResolvedValue({ id: 1, status: 'running', config: {} } as Awaited<ReturnType<AppsRepository['getAppByUrn']>>);
  config.get.calledWith('version').mockReturnValue('3.0.0' as never);
  marketplaceService.getAppUpdateInfo.mockResolvedValue({ minTipiVersion: null } as Awaited<ReturnType<MarketplaceService['getAppUpdateInfo']>>);
  appEventsQueue.publish.mockResolvedValue({ success: true, message: 'updated' });
  appFilesManager.getInstalledAppInfo.mockResolvedValue({ tipi_version: 2 } as Awaited<ReturnType<AppFilesManager['getInstalledAppInfo']>>);
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

  await handler.execute(appUrn, { performBackup: false });
  await waitForQueueResult();

  expect(statusManager.emitSuccess).toHaveBeenCalledWith(expect.objectContaining({ appId: 1, appUrn, event: 'update_success', status: 'running' }));
});
