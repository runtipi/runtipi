import { TranslatableError } from '@/common/error/translatable-error';
import { createAppUrn, extractAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import semver from 'semver';
import type { z } from 'zod';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { AppsService } from '../apps/apps.service';
import { BackupManager } from '../backups/backup.manager';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from '../queue/entities/app-events';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';
import { AppPolicyService } from './app-policy.service';
import { APP_ASYNC_MUTEX } from '@/utils/mutex/mutex.module';
import type { AsyncMutex } from '@/utils/mutex/async-mutex';
import { AppNotifierService } from './app-notifier.service';

@Injectable()
export class AppLifecycleService {
  constructor(
    private readonly logger: LoggerService,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly appRepository: AppsRepository,
    private readonly config: ConfigurationService,
    private readonly marketplaceService: MarketplaceService,
    private readonly appsService: AppsService,
    private readonly appFilesManager: AppFilesManager,
    private readonly backupManager: BackupManager,
    private readonly policy: AppPolicyService,
    private readonly notifier: AppNotifierService,
    @Inject(APP_ASYNC_MUTEX) private mutex: AsyncMutex,
  ) {
    this.logger.debug('Subscribing to app events...');
    this.appEventsQueue.onEvent((data, reply) => this.invokeCommand(data, reply));
  }

  async invokeCommand(data: z.infer<typeof appEventSchema>, reply: (response: z.output<typeof appEventResultSchema>) => Promise<void>) {
    const release = await this.mutex.acquire(data.appUrn);

    try {
      const command = this.commandFactory.createCommand(data);
      const { success, message } = await command.execute(data.appUrn, data.form);
      await reply({ success, message });
    } catch (err) {
      this.logger.error('Error invoking command:', err);
      await reply({ success: false, message: String(err) });
    } finally {
      release();
    }
  }

  /**
   * Check if the configuration has changed in a way that requires a restart
   */
  private hasConfigChanged(oldConfig: Record<string, unknown>, newConfig: Record<string, unknown>): boolean {
    const oldJSON = JSON.stringify(oldConfig);
    const newJSON = JSON.stringify(newConfig);

    return oldJSON !== newJSON;
  }

  async startApp(params: { appUrn: AppUrn; skipPull?: boolean }) {
    const { appUrn, skipPull } = params;
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.appRepository.updateAppById(app.id, { status: 'starting' });
    this.notifier.notifyStatusChange(appUrn, 'starting');

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ appUrn, command: 'start', requestId, form: { ...app.config, skipPull } }).then(async ({ success, message }) => {
      if (success) {
        this.notifier.notifySuccess('start_success', appUrn, { appStatus: 'running' });
        await this.appRepository.updateAppById(app.id, { status: 'running', pendingRestart: false });
      } else {
        this.notifier.notifyError('start_error', appUrn, message, { appStatus: 'stopped' });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });

    return { requestId };
  }

  async installApp(params: { appUrn: AppUrn; form: unknown }) {
    const { appUrn, form } = params;

    this.notifier.notifyStatusChange(appUrn, 'installing');

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (app) {
      return this.startApp({ appUrn });
    }

    // Centralized validation + normalization
    const { parsedForm, appInfo } = await this.policy.validateInstall(appUrn, form);
    const { exposed, exposedLocal, openPort, domain, isVisibleOnGuestDashboard, enableAuth, port } = parsedForm;

    const { appName, appStoreId } = extractAppUrn(appUrn);

    const createdApp = await this.appRepository.createApp({
      appName,
      status: 'installing',
      config: parsedForm,
      port: port ?? appInfo.port,
      version: appInfo.tipi_version,
      exposed: exposed ?? false,
      domain: domain ?? null,
      localSubdomain: parsedForm.localSubdomain ?? null,
      openPort: openPort ?? false,
      exposedLocal: exposedLocal ?? false,
      appStoreSlug: appStoreId,
      isVisibleOnGuestDashboard,
      enableAuth: enableAuth ?? false,
    });

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ appUrn, command: 'install', requestId, form: parsedForm }).then(async ({ success, message }) => {
      if (success) {
        this.notifier.notifySuccess('install_success', appUrn, { appStatus: 'running' });
        await this.appRepository.updateAppById(createdApp.id, { status: 'running' });
      } else {
        this.notifier.notifyError('install_error', appUrn, message, { appStatus: 'missing' });
        await this.appRepository.deleteAppById(createdApp.id);
      }
    });

    return { requestId };
  }

  /**
   * Stop an app by its ID
   */
  public async stopApp(params: { appUrn: AppUrn }) {
    const { appUrn } = params;
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    this.notifier.notifyStatusChange(appUrn, 'stopping');

    await this.appRepository.updateAppById(app.id, { status: 'stopping' });

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ command: 'stop', appUrn, requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.notifier.notifySuccess('stop_success', appUrn, { appStatus: 'stopped' });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      } else {
        this.notifier.notifyError('stop_error', appUrn, message, { appStatus: 'running' });
        await this.appRepository.updateAppById(app.id, { status: 'running' });
      }
    });

    return { requestId };
  }

  /**
   * Restart an app by its ID
   */
  public async restartApp(params: { appUrn: AppUrn }) {
    const { appUrn } = params;
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND');
    }

    this.notifier.notifyStatusChange(appUrn, 'restarting');
    await this.appRepository.updateAppById(app.id, { status: 'restarting' });

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ command: 'restart', appUrn, requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.notifier.notifySuccess('restart_success', appUrn, { appStatus: 'running' });
        await this.appRepository.updateAppById(app.id, { status: 'running', pendingRestart: false });
      } else {
        this.notifier.notifyError('restart_error', appUrn, message, { appStatus: 'running' });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });

    return { requestId };
  }

  /**
   * Uninstall an app by its ID
   */
  public async uninstallApp(params: { appUrn: AppUrn; removeBackups: boolean }) {
    const { appUrn, removeBackups } = params;

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    if (removeBackups) {
      await this.backupManager.deleteAppBackupsByUrn(appUrn);
    }

    await this.appRepository.updateAppById(app.id, { status: 'uninstalling' });
    this.notifier.notifyStatusChange(appUrn, 'uninstalling');

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ command: 'uninstall', appUrn, requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.notifier.notifySuccess('uninstall_success', appUrn, { appStatus: 'missing' });
        await this.appRepository.deleteAppById(app.id);
      } else {
        this.notifier.notifyError('uninstall_error', appUrn, message, { appStatus: 'stopped' });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });

    return { requestId };
  }

  /**
   * Reset an app by its ID
   */
  public async resetApp(params: { appUrn: AppUrn }) {
    const { appUrn } = params;
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    const appStatusBeforeReset = app?.status;
    this.notifier.notifyStatusChange(appUrn, 'resetting');
    await this.appRepository.updateAppById(app.id, { status: 'resetting' });

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ command: 'reset', appUrn, requestId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.notifier.notifySuccess('reset_success', appUrn, { appStatus: 'stopped' });
        if (appStatusBeforeReset === 'running') {
          this.startApp({ appUrn });
        } else {
          await this.appRepository.updateAppById(app.id, { status: appStatusBeforeReset });
        }
      } else {
        this.notifier.notifyError('reset_error', appUrn, message, { appStatus: appStatusBeforeReset });
        await this.appRepository.updateAppById(app.id, { status: 'running' });
      }
    });

    return { requestId };
  }

  public async updateAppConfig(params: { appUrn: AppUrn; form: unknown }) {
    const { appUrn, form } = params;

    const { parsedForm, app, appInfo } = await this.policy.validateUpdate(appUrn, form);

    const requestId = crypto.randomUUID();
    const { success, message } = await this.appEventsQueue.publish({
      command: 'generate_env',
      appUrn,
      requestId,
      form: parsedForm,
    });

    if (!success) {
      this.logger.error(`Failed to update app ${appUrn}: ${message}`);
      throw new TranslatableError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR, { cause: message });
    }

    const { exposed, domain } = parsedForm;

    const changed = await this.appRepository.updateAppById(app.id, {
      exposed: exposed ?? false,
      exposedLocal: parsedForm.exposedLocal ?? false,
      openPort: parsedForm.openPort,
      port: parsedForm.port ?? appInfo.port,
      domain: domain ?? null,
      localSubdomain: parsedForm.localSubdomain ?? null,
      config: parsedForm,
      isVisibleOnGuestDashboard: parsedForm.isVisibleOnGuestDashboard ?? false,
      enableAuth: parsedForm.enableAuth ?? false,
    });

    if (!changed?.pendingRestart) {
      const pendingRestart = this.hasConfigChanged(app.config, changed?.config || {});
      await this.appRepository.updateAppById(app.id, { pendingRestart });
    }

    return { requestId };
  }

  public async updateApp(params: { appUrn: AppUrn; performBackup: boolean }) {
    const { appUrn, performBackup } = params;
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    const version = this.config.get('version');

    const { minTipiVersion } = await this.marketplaceService.getAppUpdateInfo(appUrn);
    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: minTipiVersion });
    }

    await this.appRepository.updateAppById(app.id, { status: 'updating' });

    const appStatusBeforeUpdate = app.status;
    this.notifier.notifyStatusChange(appUrn, 'updating');

    const requestId = crypto.randomUUID();
    this.appEventsQueue.publish({ command: 'update', appUrn, requestId, form: app.config, performBackup }).then(async ({ success, message }) => {
      if (success) {
        const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

        await this.updateAppConfig({ appUrn, form: app.config });
        this.notifier.notifySuccess('update_success', appUrn);

        if (appStatusBeforeUpdate === 'running') {
          await this.appRepository.updateAppById(app.id, { version: appInfo?.tipi_version });
          this.startApp({ appUrn });
        } else {
          await this.appRepository.updateAppById(app.id, { status: appStatusBeforeUpdate, version: appInfo?.tipi_version });
        }
      } else {
        this.notifier.notifyError('update_error', appUrn, message);
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });

    return { requestId };
  }

  async updateAllApps() {
    const installedApps = await this.appsService.getInstalledApps();
    const availableUpdates = installedApps.filter(({ app, metadata }) => Number(app.version) < Number(metadata.latestVersion));

    const updatePromises = availableUpdates.map(async ({ app }) => {
      try {
        const appUrn = createAppUrn(app.appName, app.appStoreSlug);
        await this.updateApp({ appUrn, performBackup: true });
      } catch (e) {
        this.logger.error(`Failed to update app ${app.id}`, e);
      }
    });

    await Promise.all(updatePromises);
  }

  async startAllApps() {
    const apps = await this.appRepository.getApps();
    const runningApps = apps.filter((app) => app.status === 'running');

    const startPromises = runningApps.map(async (app) => {
      try {
        const appUrn = createAppUrn(app.appName, app.appStoreSlug);
        await this.startApp({ appUrn, skipPull: true });
      } catch (e) {
        this.logger.error(`Failed to start app ${app.id}`, e);
      }
    });

    await Promise.all(startPromises);
  }
}
