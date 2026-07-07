import { ConfigurationService } from '@/core/config/configuration.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { AppEventsQueue } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@runtipi/common/types';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { BackupAppHandler } from './backup-app.handler';
import { RestoreAppHandler } from './restore-app.handler';
import { StartAppHandler } from './start-app.handler';
import { StatusManagerService } from '../services/status-manager.service';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('BackupAppHandler', () => {
  const appUrn = 'test:store' as AppUrn;
  const appRepository = mock<AppsRepository>();
  const appEventsQueue = mock<AppEventsQueue>();
  const statusManager = mock<StatusManagerService>();
  const startAppHandler = mock<StartAppHandler>();
  const config = mock<ConfigurationService>();

  beforeEach(() => {
    appRepository.getAppByUrn.mockReset();
    appEventsQueue.publish.mockReset();
    statusManager.transitionTo.mockReset();
    statusManager.emitSuccess.mockReset();
    statusManager.emitError.mockReset();
    startAppHandler.execute.mockReset();
    config.get.mockReset();

    config.get.calledWith('demoMode').mockReturnValue(false);
    appEventsQueue.publish.mockResolvedValue({ success: true, message: 'ok' });
  });

  it('publishes a backup job and restores the previous stopped status on success', async () => {
    appRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: 12, status: 'stopped', config: { foo: 'bar' } }));

    const handler = new BackupAppHandler(appRepository, appEventsQueue, statusManager, startAppHandler, config);
    const result = await handler.execute(appUrn);
    await flushPromises();

    expect(result.requestId).toEqual(expect.any(String));
    expect(statusManager.transitionTo).toHaveBeenCalledWith(12, appUrn, 'backing_up');
    expect(appEventsQueue.publish).toHaveBeenCalledWith({ appUrn, command: 'backup', requestId: result.requestId, form: { foo: 'bar' } });
    expect(statusManager.emitSuccess).toHaveBeenCalledWith({
      appId: 12,
      appUrn,
      event: 'backup_success',
      status: 'stopped',
    });
  });

  it('restarts the app after backing up an app that was running', async () => {
    appRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: 13, status: 'running', config: {} }));

    const handler = new BackupAppHandler(appRepository, appEventsQueue, statusManager, startAppHandler, config);
    await handler.execute(appUrn);
    await flushPromises();

    expect(startAppHandler.execute).toHaveBeenCalledWith(appUrn);
    expect(statusManager.emitSuccess).not.toHaveBeenCalled();
  });
});

describe('RestoreAppHandler', () => {
  const appUrn = 'test:store' as AppUrn;
  const appRepository = mock<AppsRepository>();
  const appEventsQueue = mock<AppEventsQueue>();
  const statusManager = mock<StatusManagerService>();
  const appFilesManager = mock<AppFilesManager>();
  const startAppHandler = mock<StartAppHandler>();

  beforeEach(() => {
    appRepository.getAppByUrn.mockReset();
    appRepository.updateAppById.mockReset();
    appEventsQueue.publish.mockReset();
    statusManager.transitionTo.mockReset();
    statusManager.emitSuccess.mockReset();
    statusManager.emitError.mockReset();
    appFilesManager.getInstalledAppInfo.mockReset();
    startAppHandler.execute.mockReset();

    appEventsQueue.publish.mockResolvedValue({ success: true, message: 'ok' });
    appFilesManager.getInstalledAppInfo.mockResolvedValue(fromPartial({ tipi_version: 4 }));
  });

  it('publishes a restore job, records the restored version, and restores the previous status', async () => {
    appRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: 21, status: 'stopped', config: { baz: 'qux' } }));

    const handler = new RestoreAppHandler(appRepository, appEventsQueue, statusManager, appFilesManager, startAppHandler);
    const result = await handler.execute(appUrn, { filename: 'test-store-1.tar.gz' });
    await flushPromises();

    expect(result.requestId).toEqual(expect.any(String));
    expect(statusManager.transitionTo).toHaveBeenCalledWith(21, appUrn, 'restoring');
    expect(appEventsQueue.publish).toHaveBeenCalledWith({
      appUrn,
      command: 'restore',
      requestId: result.requestId,
      filename: 'test-store-1.tar.gz',
      form: { baz: 'qux' },
    });
    expect(appRepository.updateAppById).toHaveBeenCalledWith(21, { version: 4 });
    expect(statusManager.emitSuccess).toHaveBeenCalledWith({
      appId: 21,
      appUrn,
      event: 'restore_success',
      status: 'stopped',
    });
  });
});
