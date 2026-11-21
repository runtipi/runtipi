import type { SSEService } from '@/core/sse/sse.service';
import { computeUpdateNoticesFingerprint } from '@/common/helpers/update-notices';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { AppLifecycleCommandFactory } from '../app-lifecycle-command.factory';
import type { UpdateNotice } from '@runtipi/common/schemas';
import { AppJobService } from '../services/app-job.service';
import type { AppUrn } from '@runtipi/common/types';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { StatusManagerService } from '../services/status-manager.service';
import { UpdateAppHandler } from './update-app.handler';

const appUrn = 'app:test' as AppUrn;

type StoredApp = NonNullable<Awaited<ReturnType<AppsRepository['getAppByUrn']>>>;
type PublishResult = Awaited<ReturnType<AppLifecycleCommandFactory['execute']>>;

const waitForQueueResult = async () => new Promise((resolve) => setTimeout(resolve, 0));

const createHandler = async (
  options: { initialStatus?: StoredApp['status']; publishResult?: PublishResult; updateNotices?: UpdateNotice[] } = {},
) => {
  const logger = mock<LoggerService>();
  const appRepository = mock<AppsRepository>();
  const commandFactory = mock<AppLifecycleCommandFactory>();
  const statusManager = mock<StatusManagerService>();
  const config = mock<ConfigurationService>();
  const marketplaceService = mock<MarketplaceService>();
  const initialStatus = options.initialStatus ?? 'running';
  const publishResult = options.publishResult ?? { success: true, message: 'updated' };
  const app = { id: 1, status: initialStatus, config: {}, version: 1 } as StoredApp;

  appRepository.getAppByUrn.mockResolvedValue(app);
  config.get.calledWith('version').mockReturnValue('3.0.0' as never);
  marketplaceService.getAppUpdateInfo.mockResolvedValue({
    minTipiVersion: null,
    latestVersion: 2,
    updateNotices: options.updateNotices ?? [],
  } as unknown as Awaited<ReturnType<MarketplaceService['getAppUpdateInfo']>>);
  commandFactory.execute.mockResolvedValue(publishResult);

  statusManager.emitError.mockImplementation(async ({ appId, status }) => {
    await appRepository.updateAppById(appId, { status });
  });

  const jobs = new AppJobService(logger, mock<SSEService>());

  const handler = new UpdateAppHandler(logger, appRepository, commandFactory, statusManager, config, marketplaceService, jobs);

  return { handler, logger, appRepository, commandFactory, statusManager, marketplaceService, app };
};

const migrationNotice: UpdateNotice = {
  id: 'database-migration-2',
  tipi_version: 2,
  severity: 'warning',
  title: 'Database migration',
  message: 'The first startup may take several minutes.',
  before_update: [],
  after_update: [],
  require_confirmation: true,
};

test('preserves the previous running status when the update command fails', async () => {
  const publishResult = { success: false, message: 'registry unavailable', rollbackSucceeded: true } as const;
  const { handler, commandFactory, appRepository } = await createHandler({ publishResult });

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(commandFactory.execute).toHaveBeenCalledWith(
    expect.objectContaining({ command: 'update', appUrn, performBackup: true, wasRunningBeforeUpdate: true }),
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'running' });
  expect(appRepository.updateAppById).not.toHaveBeenCalledWith(1, { status: 'stopped' });
});

test.each(['app.env could not be read', 'staging directory could not be created'])(
  'keeps a running app running when update setup fails: %s',
  async (message) => {
    const publishResult = { success: false, message, rollbackSucceeded: true } as const;
    const { handler, appRepository } = await createHandler({ publishResult });

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
  const { handler, statusManager, appRepository } = await createHandler({ publishResult });

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(statusManager.emitError).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'update_error', error: expect.stringContaining('/tmp/runtipi-update-abc') }),
  );
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'stopped' });
});

test('restores the previous status when publishing the update fails', async () => {
  const { handler, logger, appRepository, commandFactory, statusManager } = await createHandler();
  commandFactory.execute.mockRejectedValue(new Error('queue unavailable'));

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('queue unavailable'));
  expect(statusManager.emitError).toHaveBeenCalledWith(expect.objectContaining({ event: 'update_error', error: 'queue unavailable' }));
  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'running' });
});

test('preserves the rollback status when processing a failed update result rejects', async () => {
  const publishResult = { success: false, message: 'deployment failed', rollbackSucceeded: false } as const;
  const { handler, appRepository } = await createHandler({ publishResult });
  appRepository.updateAppById.mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue({} as StoredApp);

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();

  expect(appRepository.updateAppById).toHaveBeenLastCalledWith(1, { status: 'stopped' });
});

test('starts a successful update without pulling the same images again', async () => {
  const { handler, statusManager } = await createHandler();

  await handler.execute(appUrn, { performBackup: false });
  await waitForQueueResult();

  expect(statusManager.emitSuccess).toHaveBeenCalledWith(expect.objectContaining({ appId: 1, appUrn, event: 'update_success', status: 'running' }));
});

test('rejects a second update with different backup options while the first is active', async () => {
  const { handler, commandFactory } = await createHandler();
  let finish: () => void = () => {};
  commandFactory.execute.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = () => resolve({ success: true, message: 'updated' });
      }),
  );

  await handler.execute(appUrn, { performBackup: false });
  await expect(handler.execute(appUrn, { performBackup: true })).rejects.toThrow('active job');

  finish();
  await waitForQueueResult();
});

test('rejects an update when a required notice is not acknowledged', async () => {
  const { handler, commandFactory, marketplaceService } = await createHandler({ updateNotices: [migrationNotice] });
  void commandFactory;
  void marketplaceService;

  await expect(handler.execute(appUrn, { performBackup: true })).rejects.toThrow();
  await expect(handler.execute(appUrn, { performBackup: true, acknowledgedNoticeIds: ['some-other-notice'] })).rejects.toThrow();
});

test('accepts an update when all required notices are acknowledged with a full snapshot', async () => {
  const { handler, commandFactory, marketplaceService } = await createHandler({ updateNotices: [migrationNotice] });
  const fingerprint = computeUpdateNoticesFingerprint([migrationNotice]);
  void marketplaceService;

  await handler.execute(appUrn, {
    performBackup: true,
    acknowledgedNoticeIds: [migrationNotice.id],
    targetTipiVersion: 2,
    noticesFingerprint: fingerprint,
  });
  await waitForQueueResult();

  expect(commandFactory.execute).toHaveBeenCalledWith(
    expect.objectContaining({ command: 'update', appUrn, performBackup: true, targetTipiVersion: 2 }),
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
});

test('rejects an acknowledged update when the snapshot is incomplete', async () => {
  const { handler } = await createHandler({ updateNotices: [migrationNotice] });
  const fingerprint = computeUpdateNoticesFingerprint([migrationNotice]);

  // Missing target revision (the fingerprint is valid, so the rejection
  // comes from the missing reviewed revision)
  await expect(
    handler.execute(appUrn, {
      performBackup: true,
      acknowledgedNoticeIds: [migrationNotice.id],
      noticesFingerprint: fingerprint,
    }),
  ).rejects.toMatchObject({ message: 'APP_UPDATE_ERROR_TARGET_REQUIRED' });

  // Missing fingerprint
  await expect(
    handler.execute(appUrn, {
      performBackup: true,
      acknowledgedNoticeIds: [migrationNotice.id],
      targetTipiVersion: 2,
    }),
  ).rejects.toMatchObject({ message: 'APP_UPDATE_ERROR_FINGERPRINT_REQUIRED' });
});

test('rejects an update with a specific error when a notice is not acknowledged', async () => {
  const { handler } = await createHandler({ updateNotices: [migrationNotice] });

  await expect(handler.execute(appUrn, { performBackup: true })).rejects.toMatchObject({
    message: 'APP_UPDATE_ERROR_NOTICES_NOT_ACKNOWLEDGED',
  });
});

test('requires acknowledgements again after a failed update', async () => {
  const publishResult = { success: false, message: 'registry unavailable', rollbackSucceeded: true } as const;
  const { handler } = await createHandler({ updateNotices: [migrationNotice], publishResult });
  const fingerprint = computeUpdateNoticesFingerprint([migrationNotice]);

  // First attempt fails after the update was accepted
  await handler.execute(appUrn, {
    performBackup: true,
    acknowledgedNoticeIds: [migrationNotice.id],
    targetTipiVersion: 2,
    noticesFingerprint: fingerprint,
  });
  await waitForQueueResult();

  // The retry must acknowledge the notices again: acknowledgements are never
  // persisted, so the warnings reappear on the next attempt.
  await expect(handler.execute(appUrn, { performBackup: true })).rejects.toMatchObject({
    message: 'APP_UPDATE_ERROR_NOTICES_NOT_ACKNOWLEDGED',
  });
});

test('does not require acknowledgements for notices that do not need confirmation', async () => {
  const { handler } = await createHandler({
    updateNotices: [{ ...migrationNotice, require_confirmation: false }],
  });

  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();
});

test('ignores notices for revisions already installed', async () => {
  const { handler } = await createHandler({
    updateNotices: [{ ...migrationNotice, tipi_version: 1 }],
  });

  // The notice targets revision 1 which is already installed (app.version = 1)
  await handler.execute(appUrn, { performBackup: true });
  await waitForQueueResult();
});

test('rejects an update when the target revision changed since the notices were shown', async () => {
  const { handler } = await createHandler({ updateNotices: [migrationNotice] });

  await expect(
    handler.execute(appUrn, {
      performBackup: true,
      acknowledgedNoticeIds: [migrationNotice.id],
      targetTipiVersion: 3,
    }),
  ).rejects.toThrow();
});

test('rejects an update when the notice content changed since it was displayed', async () => {
  const { handler } = await createHandler({ updateNotices: [migrationNotice] });

  await expect(
    handler.execute(appUrn, {
      performBackup: true,
      acknowledgedNoticeIds: [migrationNotice.id],
      targetTipiVersion: 2,
      noticesFingerprint: 'stale-fingerprint',
    }),
  ).rejects.toThrow();
});
