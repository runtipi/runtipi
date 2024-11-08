import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { SocketManager } from '@/core/socket/socket.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { lt, valid } from 'semver';
import { isFQDN } from 'validator';
import type { z } from 'zod';
import { AppFilesManager } from '../apps/app-files-manager';
import { AppsRepository } from '../apps/apps.repository';
import { type AppEventFormInput, AppEventsQueue, appEventSchema } from '../queue/entities/app-events';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';

@Injectable()
export class AppLifecycleService {
  constructor(
    private readonly logger: LoggerService,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly appRepository: AppsRepository,
    private readonly config: ConfigurationService,
    private readonly appFilesManager: AppFilesManager,
    private readonly socketManager: SocketManager,
  ) {
    this.logger.debug('Subscribing to app events...');
    this.appEventsQueue.onEvent(({ eventId, ...data }) => this.invokeCommand(eventId, data));
  }

  async invokeCommand(eventId: string, data: z.infer<typeof appEventSchema>) {
    try {
      const command = this.commandFactory.createCommand(data);
      const { success, message } = await command.execute(data.appid, data.form);
      this.appEventsQueue.sendEventResponse(eventId, { success, message });
    } catch (err) {
      this.logger.error(`Error invoking command: ${err}`);
      this.appEventsQueue.sendEventResponse(eventId, { success: false, message: String(err) });
    }
  }

  async startApp(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId }, HttpStatus.NOT_FOUND);
    }

    await this.appRepository.updateApp(appId, { status: 'starting' });
    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'starting' } });

    this.appEventsQueue.publishAsync({ appid: appId, command: 'start', form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} started successfully`);
        this.socketManager.emit({ type: 'app', event: 'start_success', data: { appId, appStatus: 'running' } });
        await this.appRepository.updateApp(appId, { status: 'running' });
      } else {
        this.logger.error(`Failed to start app ${appId}: ${message}`);
        this.socketManager.emit({ type: 'app', event: 'start_error', data: { appId, appStatus: 'stopped' } });
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  async installApp(params: { appId: string; form: AppEventFormInput }): Promise<void> {
    const { appId, form } = params;
    const { demoMode, version, architecture } = this.config.getConfig();

    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'installing' } });

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
    this.appEventsQueue.publishAsync({ appid: appId, command: 'install', form }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} installed successfully`);
        await this.socketManager.emit({ type: 'app', event: 'install_success', data: { appId, appStatus: 'running' } });
        await this.appRepository.updateApp(appId, { status: 'running' });
      } else {
        this.socketManager.emit({ type: 'app', event: 'install_error', data: { appId, appStatus: 'missing' } });
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

    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'stopping' } });

    await this.appRepository.updateApp(appId, { status: 'stopping' });

    // Send stop command to the queue
    this.appEventsQueue.publishAsync({ command: 'stop', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.socketManager.emit({ type: 'app', event: 'stop_success', data: { appId, appStatus: 'stopped' } });
        this.logger.info(`App ${appId} stopped successfully`);
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      } else {
        this.socketManager.emit({ type: 'app', event: 'stop_error', data: { appId, appStatus: 'running' } });
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

    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'restarting' } });
    await this.appRepository.updateApp(appId, { status: 'restarting' });

    this.appEventsQueue.publishAsync({ command: 'restart', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} restarted successfully`);
        this.socketManager.emit({ type: 'app', event: 'restart_success', data: { appId, appStatus: 'running' } });
        await this.appRepository.updateApp(appId, { status: 'running' });
      } else {
        this.logger.error(`Failed to restart app ${appId}: ${message}`);
        this.socketManager.emit({ type: 'app', event: 'restart_error', data: { appId, appStatus: 'running' } });
        await this.appRepository.updateApp(appId, { status: 'stopped' });
      }
    });
  }

  /**
   * Uninstall an app by its ID
   */
  public async uninstallApp(params: { appId: string }) {
    const { appId } = params;

    const app = await this.appRepository.getApp(appId);

    if (!app) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    await this.appRepository.updateApp(appId, { status: 'uninstalling' });
    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'uninstalling' } });

    this.appEventsQueue.publishAsync({ command: 'uninstall', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} uninstalled successfully`);
        await this.appRepository.deleteApp(appId);
        await this.socketManager.emit({ type: 'app', event: 'uninstall_success', data: { appId, appStatus: 'missing' } });
      } else {
        this.logger.error(`Failed to uninstall app ${appId}: ${message}`);
        await this.appRepository.updateApp(appId, { status: 'stopped' });
        await this.socketManager.emit({ type: 'app', event: 'uninstall_error', data: { appId, appStatus: 'stopped' } });
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
    this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'resetting' } });
    await this.appRepository.updateApp(appId, { status: 'resetting' });

    this.appEventsQueue.publishAsync({ command: 'reset', appid: appId, form: app.config }).then(async ({ success, message }) => {
      if (success) {
        this.logger.info(`App ${appId} reset successfully`);
        await this.socketManager.emit({ type: 'app', event: 'reset_success', data: { appId, appStatus: 'stopped' } });
        if (appStatusBeforeReset === 'running') {
          this.startApp({ appId });
        } else {
          await this.appRepository.updateApp(appId, { status: 'running' });
        }
      } else {
        this.logger.error(`Failed to reset app ${appId}: ${message}`);
        await this.socketManager.emit({ type: 'app', event: 'reset_error', data: { appId, appStatus: 'running' } });
        await this.appRepository.updateApp(appId, { status: 'running' });
      }
    });
  }
}
