import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { lt, valid } from 'semver';
import semver from 'semver';
import validator, { isFQDN } from 'validator';
import type { z } from 'zod';
import { AppCatalogService } from '../apps/app-catalog.service';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { BackupManager } from '../backups/backup.manager';
import { type AppEventFormInput, AppEventsQueue, appEventResultSchema, appEventSchema } from '../queue/entities/app-events';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';
import { appFormSchema } from './dto/app-lifecycle.dto';

@Injectable()
export class AppLifecycleService {
  constructor(
    private readonly logger: LoggerService,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly appRepository: AppsRepository,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
    private readonly sseService: SSEService,
    private readonly backupManager: BackupManager,
    private readonly appCatalog: AppCatalogService,
  ) {
    this.logger.debug('Subscribing to app events...');
    this.appEventsQueue.onEvent((data, reply) => this.invokeCommand(data, reply));
  }

  async invokeCommand(data: z.infer<typeof appEventSchema>, reply: (response: z.output<typeof appEventResultSchema>) => Promise<void>) {
    try {
      const command = this.commandFactory.createCommand(data);
      const { success, message } = await command.execute(data.appid, data.form);
      await reply({ success, message });
    } catch (err) {
      this.logger.error(`Error invoking command: ${err}`);
      await reply({ success: false, message: String(err) });
    }
  }

  async startApp(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId }, HttpStatus.NOT_FOUND);
    }

    await this.appRepository.updateApp(appId, { status: 'starting' });
    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'starting' });

    this.appEventsQueue.publish({ appid: appId, command: 'start', form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} started successfully`);
        this.sseService.emit('app', { event: 'start_success', appId, appStatus: 'running' });
        await this.appRepository.updateApp(appId, { status: 'running' });
      } else {
        this.logger.error(`Failed to start app ${appId}: ${message}`);
        this.sseService.emit('app', { event: 'start_error', appId, appStatus: 'stopped', error: message });
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  async installApp(params: { appId: string; form: AppEventFormInput }): Promise<void> {
    const { appId, form } = params;
    const { demoMode, version, architecture } = this.config.getConfig();

    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'installing' });

    const app = await this.appRepository.getApp(appId);

    if (app) {
      return this.startApp({ appId });
    }

    const { exposed, exposedLocal, openPort, domain, isVisibleOnGuestDashboard } = form;
    const apps = await this.appRepository.getApps();

    if (apps.length >= 6 && demoMode) {
      throw new TranslatableError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
    }

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
    }

    const appInfo = await this.appFilesManager.getAppInfoFromAppStore(appId);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId }, HttpStatus.NOT_FOUND);
    }

    if (appInfo.supported_architectures?.length && !appInfo.supported_architectures.includes(architecture)) {
      throw new TranslatableError('APP_ERROR_ARCHITECTURE_NOT_SUPPORTED', { id: appId, arch: architecture });
    }

    if (!appInfo.exposable && exposed) {
      throw new TranslatableError('APP_ERROR_APP_NOT_EXPOSABLE', { id: appId });
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appId });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.appRepository.getAppsByDomain(domain, appId);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
      }
    }

    if (appInfo?.min_tipi_version && valid(version) && lt(version, appInfo.min_tipi_version)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appId, minVersion: appInfo.min_tipi_version });
    }

    await this.appRepository.createApp({
      id: appId,
      status: 'installing',
      config: form,
      version: appInfo.tipi_version,
      exposed: exposed || false,
      domain: domain || null,
      openPort: openPort || false,
      exposedLocal: exposedLocal || false,
      isVisibleOnGuestDashboard,
    });

    // Send install command to the queue
    this.appEventsQueue.publish({ appid: appId, command: 'install', form }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} installed successfully`);

        this.sseService.emit('app', { event: 'install_success', appId, appStatus: 'running' });
        await this.appRepository.updateApp(appId, { status: 'running' });
      } else {
        this.sseService.emit('app', { event: 'install_error', appId, appStatus: 'missing', error: message });
        this.logger.error(`Failed to install app ${appId}: ${message}`);
        await this.appRepository.deleteApp(appId);
      }
    });
  }

  /**
   * Stop an app by its ID
   */
  public async stopApp(params: { appId: string }) {
    const { appId } = params;
    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId }, HttpStatus.NOT_FOUND);
    }

    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'stopping' });

    await this.appRepository.updateApp(appId, { status: 'stopping' });

    // Send stop command to the queue
    this.appEventsQueue.publish({ command: 'stop', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.sseService.emit('app', { event: 'stop_success', appId, appStatus: 'stopped' });
        this.logger.info(`App ${appId} stopped successfully`);
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      } else {
        this.sseService.emit('app', { event: 'stop_error', appId, appStatus: 'running', error: message });
        this.logger.error(`Failed to stop app ${appId}: ${message}`);
        await this.appRepository.updateApp(appId, { status: 'running' });
      }
    });
  }

  /**
   * Restart an app by its ID
   */
  public async restartApp(params: { appId: string }) {
    const { appId } = params;
    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND');
    }

    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'restarting' });
    await this.appRepository.updateApp(appId, { status: 'restarting' });

    this.appEventsQueue.publish({ command: 'restart', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} restarted successfully`);
        this.sseService.emit('app', { event: 'restart_success', appId, appStatus: 'running' });
        await this.appRepository.updateApp(appId, { status: 'running' });
      } else {
        this.logger.error(`Failed to restart app ${appId}: ${message}`);
        this.sseService.emit('app', { event: 'restart_error', appId, appStatus: 'running', error: message });
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  /**
   * Uninstall an app by its ID
   */
  public async uninstallApp(params: { appId: string; removeBackups: boolean }) {
    const { appId, removeBackups } = params;

    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    if (removeBackups) {
      await this.backupManager.deleteAppBackupsById(appId);
    }

    await this.appRepository.updateApp(appId, { status: 'uninstalling' });
    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'uninstalling' });

    this.appEventsQueue.publish({ command: 'uninstall', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} uninstalled successfully`);
        await this.appRepository.deleteApp(appId);
        this.sseService.emit('app', { event: 'uninstall_success', appId, appStatus: 'missing' });
      } else {
        this.logger.error(`Failed to uninstall app ${appId}: ${message}`);
        await this.appRepository.updateApp(appId, { status: 'stopped' });
        this.sseService.emit('app', { event: 'uninstall_error', appId, appStatus: 'stopped', error: message });
      }
    });
  }

  /**
   * Reset an app by its ID
   */
  public async resetApp(params: { appId: string }) {
    const { appId } = params;
    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const appStatusBeforeReset = app?.status;
    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'resetting' });
    await this.appRepository.updateApp(appId, { status: 'resetting' });

    this.appEventsQueue.publish({ command: 'reset', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} reset successfully`);
        this.sseService.emit('app', { event: 'reset_success', appId, appStatus: 'stopped' });
        if (appStatusBeforeReset === 'running') {
          this.startApp({ appId });
        } else {
          await this.appRepository.updateApp(appId, { status: appStatusBeforeReset });
        }
      } else {
        this.logger.error(`Failed to reset app ${appId}: ${message}`);
        this.sseService.emit('app', { event: 'reset_error', appId, appStatus: appStatusBeforeReset, error: message });
        await this.appRepository.updateApp(appId, { status: 'running' });
      }
    });
  }

  public async updateAppConfig(params: { appId: string; form: unknown }) {
    const { appId, form } = params;

    const parsedForm = appFormSchema.parse(form);

    const { exposed, domain } = parsedForm;

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID');
    }

    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const appInfo = await this.appFilesManager.getInstalledAppInfo(appId);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    if (!appInfo.exposable && exposed) {
      throw new TranslatableError('APP_ERROR_APP_NOT_EXPOSABLE', { id: appId });
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appId });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.appRepository.getAppsByDomain(domain, appId);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
      }
    }

    const { success, message } = await this.appEventsQueue.publish({
      command: 'generate_env',
      appid: appId,
      form: parsedForm,
    });

    if (!success) {
      this.logger.error(`Failed to update app ${appId}: ${message}`);
      throw new TranslatableError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appId }, HttpStatus.INTERNAL_SERVER_ERROR, { cause: message });
    }

    await this.appRepository.updateApp(appId, {
      exposed: exposed ?? false,
      exposedLocal: parsedForm.exposedLocal ?? false,
      openPort: parsedForm.openPort,
      domain: domain || null,
      config: parsedForm,
      isVisibleOnGuestDashboard: parsedForm.isVisibleOnGuestDashboard ?? false,
    });
  }

  public async updateApp(params: { appId: string; performBackup: boolean }) {
    const { appId, performBackup } = params;
    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    const version = this.config.get('version');

    const { minTipiVersion } = await this.appFilesManager.getAppUpdateInfo(appId);
    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appId, minVersion: minTipiVersion });
    }

    await this.appRepository.updateApp(appId, { status: 'updating' });

    const appStatusBeforeUpdate = app.status;
    this.sseService.emit('app', { event: 'status_change', appId, appStatus: 'updating' });

    this.appEventsQueue.publish({ command: 'update', appid: appId, form: app.config, performBackup }).then(async ({ success, message }) => {
      if (success) {
        const appInfo = await this.appFilesManager.getInstalledAppInfo(appId);

        await this.appRepository.updateApp(appId, { status: appStatusBeforeUpdate, version: appInfo?.tipi_version });
        await this.updateAppConfig({ appId, form: app.config });
        this.sseService.emit('app', { event: 'update_success', appId });

        if (appStatusBeforeUpdate === 'running') {
          this.startApp({ appId });
        }
      } else {
        this.logger.error(`Failed to update app ${appId}: ${message}`);
        this.sseService.emit('app', { event: 'update_error', appId, appStatus: 'stopped', error: message });
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  async updateAllApps() {
    const installedApps = await this.appCatalog.getInstalledApps();
    const availableUpdates = installedApps.filter(({ app, updateInfo }) => Number(app.version) < Number(updateInfo.latestVersion));

    const updatePromises = availableUpdates.map(async ({ app }) => {
      try {
        await this.updateApp({ appId: app.id, performBackup: true });
      } catch (e) {
        this.logger.error(`Failed to update app ${app.id}`, e);
      }
    });

    await Promise.all(updatePromises);
  }
}
