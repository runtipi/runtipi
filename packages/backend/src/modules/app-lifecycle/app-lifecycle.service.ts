import { TranslatableError } from '@/common/error/translatable-error';
import { createAppUrn, extractAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import type { AppUrn } from '@/types/app/app.types';
import { HttpStatus, Injectable } from '@nestjs/common';
import { lt, valid } from 'semver';
import semver from 'semver';
import validator, { isFQDN } from 'validator';
import type { z } from 'zod';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { AppsService } from '../apps/apps.service';
import { BackupManager } from '../backups/backup.manager';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from '../queue/entities/app-events';
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
    private readonly marketplaceService: MarketplaceService,
    private readonly appsService: AppsService,
    private readonly appFilesManager: AppFilesManager,
    private readonly sseService: SSEService,
    private readonly backupManager: BackupManager,
  ) {
    this.logger.debug('Subscribing to app events...');
    this.appEventsQueue.onEvent((data, reply) => this.invokeCommand(data, reply));
  }

  async invokeCommand(data: z.infer<typeof appEventSchema>, reply: (response: z.output<typeof appEventResultSchema>) => Promise<void>) {
    try {
      const command = this.commandFactory.createCommand(data);
      const { success, message } = await command.execute(data.appUrn, data.form);
      await reply({ success, message });
    } catch (err) {
      this.logger.error(`Error invoking command: ${err}`);
      await reply({ success: false, message: String(err) });
    }
  }

  async startApp(params: { appUrn: AppUrn }) {
    const { appUrn } = params;
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    await this.appRepository.updateAppById(app.id, { status: 'starting' });
    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'starting' });

    this.appEventsQueue.publish({ appUrn, command: 'start', form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appUrn} started successfully`);
        this.sseService.emit('app', { event: 'start_success', appUrn, appStatus: 'running' });
        await this.appRepository.updateAppById(app.id, { status: 'running' });
      } else {
        this.logger.error(`Failed to start app ${appUrn}: ${message}`);
        this.sseService.emit('app', { event: 'start_error', appUrn, appStatus: 'stopped', error: message });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });
  }

  async installApp(params: { appUrn: AppUrn; form: unknown }): Promise<void> {
    const { appUrn, form } = params;
    const { demoMode, version, architecture } = this.config.getConfig();

    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'installing' });

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (app) {
      return this.startApp({ appUrn });
    }

    const parsedForm = appFormSchema.parse(form);
    const { exposed, exposedLocal, openPort, domain, isVisibleOnGuestDashboard, enableAuth } = parsedForm;
    const apps = await this.appRepository.getApps();

    if (demoMode && apps.length >= 6) {
      throw new TranslatableError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
    }

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
    }

    const appInfo = await this.marketplaceService.getAppInfoFromAppStore(appUrn);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    }

    if (appInfo.supported_architectures?.length && !appInfo.supported_architectures.includes(architecture)) {
      throw new TranslatableError('APP_ERROR_ARCHITECTURE_NOT_SUPPORTED', { id: appUrn, arch: architecture });
    }

    if (!appInfo.exposable) {
      if (exposed || exposedLocal || enableAuth) {
        this.logger.warn(`App ${appUrn} is not exposable, resetting proxy settings`);
      }
      parsedForm.exposed = false;
      parsedForm.exposedLocal = false;
      parsedForm.enableAuth = false;
      parsedForm.domain = undefined;
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appUrn });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.appRepository.getAppsByDomain(domain);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.appName });
      }
    }

    if (appInfo?.min_tipi_version && valid(version) && lt(version, appInfo.min_tipi_version)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: appInfo.min_tipi_version });
    }

    const { appName, appStoreId } = extractAppUrn(appUrn);

    const createdApp = await this.appRepository.createApp({
      appName,
      status: 'installing',
      config: parsedForm,
      port: parsedForm.port ?? appInfo.port,
      version: appInfo.tipi_version,
      exposed: exposed ?? false,
      domain: domain ?? null,
      openPort: openPort ?? false,
      exposedLocal: exposedLocal ?? false,
      appStoreSlug: appStoreId,
      isVisibleOnGuestDashboard,
      enableAuth: enableAuth ?? false,
    });

    // Send install command to the queue
    this.appEventsQueue.publish({ appUrn, command: 'install', form: parsedForm }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appUrn} installed successfully`);
        this.sseService.emit('app', { event: 'install_success', appUrn, appStatus: 'running' });
        await this.appRepository.updateAppById(createdApp.id, { status: 'running' });
      } else {
        this.sseService.emit('app', { event: 'install_error', appUrn, appStatus: 'missing', error: message });
        this.logger.error(`Failed to install app ${appUrn}: ${message}`);
        await this.appRepository.deleteAppById(createdApp.id);
      }
    });
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

    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'stopping' });

    await this.appRepository.updateAppById(app.id, { status: 'stopping' });

    // Send stop command to the queue
    this.appEventsQueue.publish({ command: 'stop', appUrn, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.sseService.emit('app', { event: 'stop_success', appUrn, appStatus: 'stopped' });
        this.logger.info(`App ${appUrn} stopped successfully`);
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      } else {
        this.sseService.emit('app', { event: 'stop_error', appUrn, appStatus: 'running', error: message });
        this.logger.error(`Failed to stop app ${appUrn}: ${message}`);
        await this.appRepository.updateAppById(app.id, { status: 'running' });
      }
    });
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

    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'restarting' });
    await this.appRepository.updateAppById(app.id, { status: 'restarting' });

    this.appEventsQueue.publish({ command: 'restart', appUrn, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appUrn} restarted successfully`);
        this.sseService.emit('app', { event: 'restart_success', appUrn, appStatus: 'running' });
        await this.appRepository.updateAppById(app.id, { status: 'running' });
      } else {
        this.logger.error(`Failed to restart app ${appUrn}: ${message}`);
        this.sseService.emit('app', { event: 'restart_error', appUrn, appStatus: 'running', error: message });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });
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
    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'uninstalling' });

    this.appEventsQueue.publish({ command: 'uninstall', appUrn, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appUrn} uninstalled successfully`);
        await this.appRepository.deleteAppById(app.id);
        this.sseService.emit('app', { event: 'uninstall_success', appUrn, appStatus: 'missing' });
      } else {
        this.logger.error(`Failed to uninstall app ${appUrn}: ${message}`);
        this.sseService.emit('app', { event: 'uninstall_error', appUrn, appStatus: 'stopped', error: message });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });
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
    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'resetting' });
    await this.appRepository.updateAppById(app.id, { status: 'resetting' });

    this.appEventsQueue.publish({ command: 'reset', appUrn, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appUrn} reset successfully`);
        this.sseService.emit('app', { event: 'reset_success', appUrn, appStatus: 'stopped' });
        if (appStatusBeforeReset === 'running') {
          this.startApp({ appUrn });
        } else {
          await this.appRepository.updateAppById(app.id, { status: appStatusBeforeReset });
        }
      } else {
        this.logger.error(`Failed to reset app ${appUrn}: ${message}`);
        this.sseService.emit('app', { event: 'reset_error', appUrn, appStatus: appStatusBeforeReset, error: message });
        await this.appRepository.updateAppById(app.id, { status: 'running' });
      }
    });
  }

  public async updateAppConfig(params: { appUrn: AppUrn; form: unknown }) {
    const { appUrn, form } = params;

    const parsedForm = appFormSchema.parse(form);

    const { exposed, domain, exposedLocal, enableAuth } = parsedForm;

    if (exposed && !domain) {
      throw new TranslatableError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatableError('APP_ERROR_DOMAIN_NOT_VALID');
    }

    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

    if (!appInfo) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn });
    }

    if (!appInfo.exposable) {
      if (exposed || exposedLocal || enableAuth) {
        this.logger.warn(`App ${appUrn} is not exposable, resetting proxy settings`);
      }
      parsedForm.exposed = false;
      parsedForm.exposedLocal = false;
      parsedForm.enableAuth = false;
      parsedForm.domain = undefined;
    }

    if (appInfo.force_expose && !exposed) {
      throw new TranslatableError('APP_ERROR_APP_FORCE_EXPOSED', { id: appUrn });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.appRepository.getAppsByDomain(domain, app.id);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatableError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.appName });
      }
    }

    const { success, message } = await this.appEventsQueue.publish({
      command: 'generate_env',
      appUrn,
      form: parsedForm,
    });

    if (!success) {
      this.logger.error(`Failed to update app ${appUrn}: ${message}`);
      throw new TranslatableError('APP_ERROR_APP_FAILED_TO_UPDATE', { id: appUrn }, HttpStatus.INTERNAL_SERVER_ERROR, { cause: message });
    }

    await this.appRepository.updateAppById(app.id, {
      exposed: exposed ?? false,
      exposedLocal: parsedForm.exposedLocal ?? false,
      openPort: parsedForm.openPort,
      port: parsedForm.port ?? appInfo.port,
      domain: domain ?? null,
      config: parsedForm,
      isVisibleOnGuestDashboard: parsedForm.isVisibleOnGuestDashboard ?? false,
      enableAuth: parsedForm.enableAuth ?? false,
    });
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
    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: 'updating' });

    this.appEventsQueue.publish({ command: 'update', appUrn, form: app.config, performBackup }).then(async ({ success, message }) => {
      if (success) {
        const appInfo = await this.appFilesManager.getInstalledAppInfo(appUrn);

        await this.appRepository.updateAppById(app.id, { status: appStatusBeforeUpdate, version: appInfo?.tipi_version });
        await this.updateAppConfig({ appUrn, form: app.config });
        this.sseService.emit('app', { event: 'update_success', appUrn });

        if (appStatusBeforeUpdate === 'running') {
          this.startApp({ appUrn });
        }
      } else {
        this.logger.error(`Failed to update app ${appUrn}: ${message}`);
        this.sseService.emit('app', { event: 'update_error', appUrn, error: message });
        await this.appRepository.updateAppById(app.id, { status: 'stopped' });
      }
    });
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
        await this.startApp({ appUrn });
      } catch (e) {
        this.logger.error(`Failed to start app ${app.id}`, e);
      }
    });

    await Promise.all(startPromises);
  }
}
