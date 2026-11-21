import { describeError } from '@/common/error/diagnostic-error';
import { AppOperationsService } from './services/app-operations.service';
import { TranslatableError } from '@/common/error/translatable-error';
import { APP_ASYNC_MUTEX } from '@/utils/mutex/mutex.module';
import type { AsyncMutex } from '@/utils/mutex/async-mutex';
import { createAppUrn } from '@/common/helpers/app-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../apps/apps.repository';
import { AppsService } from '../apps/apps.service';
import { BackupManager } from '../backups/backup.manager';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from '../queue/entities/app-events';
import { AppMigrationService } from './services/app-migration.service';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';
import { InstallAppHandler } from './handlers/install-app.handler';
import { ResetAppHandler } from './handlers/reset-app.handler';
import { RestartAppHandler } from './handlers/restart-app.handler';
import { StartAppHandler } from './handlers/start-app.handler';
import { StopAppHandler } from './handlers/stop-app.handler';
import { UninstallAppHandler } from './handlers/uninstall-app.handler';
import { UpdateAppHandler } from './handlers/update-app.handler';
import { UpdateConfigHandler } from './handlers/update-config.handler';
import { BackupAppHandler } from './handlers/backup-app.handler';
import { RestoreAppHandler } from './handlers/restore-app.handler';

export type BulkCommand = 'start' | 'stop' | 'restart' | 'update';
export type BulkResult =
  | { urn: AppUrn; status: 'accepted'; requestId: string }
  | { urn: AppUrn; status: 'rejected'; message: string }
  | { urn: AppUrn; status: 'skipped'; message: string };

/** Reason reported for apps that the bulk update leaves for an individual, reviewed update. */
export const UPDATE_NOTICES_REQUIRE_CONFIRMATION = 'UPDATE_NOTICES_REQUIRE_CONFIRMATION';

@Injectable()
export class AppLifecycleService {
  constructor(
    private readonly logger: LoggerService,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly appRepository: AppsRepository,
    private readonly appsService: AppsService,
    @Inject(APP_ASYNC_MUTEX) private mutex: AsyncMutex,
    private readonly backupManager: BackupManager,
    private readonly appMigrationService: AppMigrationService,
    private readonly startAppHandler: StartAppHandler,
    private readonly stopAppHandler: StopAppHandler,
    private readonly restartAppHandler: RestartAppHandler,
    private readonly installAppHandler: InstallAppHandler,
    private readonly uninstallAppHandler: UninstallAppHandler,
    private readonly resetAppHandler: ResetAppHandler,
    private readonly updateConfigHandler: UpdateConfigHandler,
    private readonly updateAppHandler: UpdateAppHandler,
    private readonly backupAppHandler: BackupAppHandler,
    private readonly restoreAppHandler: RestoreAppHandler,
    private readonly operations: AppOperationsService,
  ) {
    this.logger.debug('Subscribing to app events...');
    this.appEventsQueue.onEvent((data, reply) => this.invokeCommand(data, reply));
  }

  async invokeCommand(data: typeof appEventSchema.infer, reply: (response: typeof appEventResultSchema.infer) => Promise<void>) {
    if (data.command === 'update' || data.command === 'backup') {
      await reply({ success: false, message: 'This queued job has expired. Submit a new update or backup from the dashboard or CLI.' });
      return;
    }

    try {
      await reply(await this.commandFactory.execute(data));
    } catch (err) {
      this.logger.error('Error invoking command:', err);
      await reply({ success: false, message: String(err) });
    }
  }

  async startApp(params: { appUrn: AppUrn; skipPull?: boolean }) {
    return this.operations.admit(params.appUrn, () => this.startAppHandler.execute(params.appUrn, { skipPull: params.skipPull }));
  }

  async installApp(params: { appUrn: AppUrn; form: unknown; skipRun?: boolean }) {
    return this.operations.admit(params.appUrn, () => this.installAppHandler.execute(params.appUrn, { form: params.form, skipRun: params.skipRun }));
  }

  public async stopApp(params: { appUrn: AppUrn }) {
    return this.operations.admit(params.appUrn, () => this.stopAppHandler.execute(params.appUrn));
  }

  public async restartApp(params: { appUrn: AppUrn; skipPull?: boolean }) {
    return this.operations.admit(params.appUrn, () => this.restartAppHandler.execute(params.appUrn, { skipPull: params.skipPull }));
  }

  public async uninstallApp(params: { appUrn: AppUrn; removeBackups: boolean }) {
    return this.operations.admit(params.appUrn, () => this.uninstallAppHandler.execute(params.appUrn, { removeBackups: params.removeBackups }));
  }

  public async resetApp(params: { appUrn: AppUrn }) {
    return this.operations.admit(params.appUrn, () => this.resetAppHandler.execute(params.appUrn));
  }

  public async updateAppSettings(params: { appUrn: AppUrn; form: unknown }) {
    return this.operations.admit(params.appUrn, () => this.updateConfigHandler.execute(params.appUrn, { form: params.form }));
  }

  public async updateApp(params: {
    appUrn: AppUrn;
    performBackup: boolean;
    acknowledgedNoticeIds?: string[];
    targetTipiVersion?: number;
    noticesFingerprint?: string;
  }) {
    return this.operations.admit(params.appUrn, () =>
      this.updateAppHandler.execute(params.appUrn, {
        performBackup: params.performBackup,
        acknowledgedNoticeIds: params.acknowledgedNoticeIds,
        targetTipiVersion: params.targetTipiVersion,
        noticesFingerprint: params.noticesFingerprint,
      }),
    );
  }

  public async backupApp(params: { appUrn: AppUrn }) {
    return this.operations.admit(params.appUrn, () => this.backupAppHandler.execute(params.appUrn));
  }

  public async restoreApp(params: { appUrn: AppUrn; filename: string }) {
    return this.operations.admit(params.appUrn, () => this.restoreAppHandler.execute(params.appUrn, { filename: params.filename }));
  }

  public async deleteAppBackup(params: { appUrn: AppUrn; filename: string }) {
    return this.operations.admit(params.appUrn, async () => {
      const release = await this.mutex.acquire(params.appUrn);

      try {
        await this.appMigrationService.reconcile(params.appUrn);
        await this.backupManager.deleteBackup(params.appUrn, params.filename);
      } finally {
        release();
      }
    });
  }

  async runBulk(command: BulkCommand): Promise<BulkResult[]> {
    const installed = await this.appsService.getInstalledApps();
    const eligible = installed.filter(({ app, metadata }) => {
      if (command === 'start') return app.status === 'stopped';
      if (command === 'update') return app.version < metadata.latestVersion && app.ignoredVersion !== metadata.latestVersion;
      return app.status === 'running';
    });
    const results: BulkResult[] = [];

    // Apps whose applicable update notices require manual confirmation are
    // never updated by a bulk action; they must be updated individually so
    // the notices are displayed and acknowledged in the update wizard.
    const submittable =
      command === 'update' ? eligible.filter(({ metadata }) => !metadata.updateNotices.some((notice) => notice.require_confirmation)) : eligible;

    if (submittable.length !== eligible.length) {
      const skipped = eligible.filter((app) => !submittable.includes(app));
      this.logger.info(
        `Skipping update of ${skipped.length} apps because their update notices require manual confirmation: ${skipped.map(({ info }) => info.urn).join(', ')}`,
      );
      for (const { info } of skipped) {
        results.push({ urn: info.urn, status: 'skipped', message: UPDATE_NOTICES_REQUIRE_CONFIRMATION });
      }
    }

    for (const { info } of submittable) {
      const appUrn = info.urn;
      try {
        const request = await this.submitBulkCommand(command, appUrn);
        results.push({ urn: appUrn, status: 'accepted', requestId: request.requestId });
      } catch (error) {
        this.logger.error('Failed to submit bulk app operation', { appUrn, command, ...describeError(error) });
        let message = 'Could not submit the operation. Check the instance logs.';
        if (error instanceof TranslatableError) message = error.message;
        else if (error instanceof HttpException && error.getStatus() < 500) message = error.message;

        results.push({ urn: appUrn, status: 'rejected', message });
      }
    }

    return results;
  }

  private submitBulkCommand(command: BulkCommand, appUrn: AppUrn) {
    switch (command) {
      case 'start':
        return this.startApp({ appUrn, skipPull: true });
      case 'stop':
        return this.stopApp({ appUrn });
      case 'restart':
        return this.restartApp({ appUrn });
      case 'update':
        return this.updateApp({ appUrn, performBackup: true });
    }
  }

  updateAllApps() {
    return this.runBulk('update');
  }

  async restartRunningApps() {
    const apps = await this.appRepository.getApps();
    const runningApps = apps.filter((app) => app.status === 'running');

    (async () => {
      for (const app of runningApps) {
        try {
          const appUrn = createAppUrn(app.appName, app.appStoreSlug);
          await this.startApp({ appUrn, skipPull: true });
        } catch (e) {
          this.logger.error(`Failed to start app ${app.id}`, e);
        }
      }
    })();
  }

  startAllApps() {
    return this.runBulk('start');
  }

  stopAllApps() {
    return this.runBulk('stop');
  }

  async backupAllApps() {
    const apps = await this.appRepository.getApps();
    const runningApps = apps.filter((app) => app.status === 'running');

    (async () => {
      for (const app of runningApps) {
        try {
          const appUrn = createAppUrn(app.appName, app.appStoreSlug);
          await this.backupApp({ appUrn });
        } catch (e) {
          this.logger.error(`Failed to backup app ${app.id}`, e);
        }
      }
    })();
  }

  restartAllApps() {
    return this.runBulk('restart');
  }
}
