import { createAppUrn } from '@/common/helpers/app-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { APP_ASYNC_MUTEX } from '@/utils/mutex/mutex.module';
import type { AsyncMutex } from '@/utils/mutex/async-mutex';
import { Inject, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../apps/apps.repository';
import { AppsService } from '../apps/apps.service';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from '../queue/entities/app-events';
import { AppLifecycleCommandFactory } from './app-lifecycle-command.factory';
import { InstallAppHandler } from './handlers/install-app.handler';
import { ResetAppHandler } from './handlers/reset-app.handler';
import { RestartAppHandler } from './handlers/restart-app.handler';
import { StartAppHandler } from './handlers/start-app.handler';
import { StopAppHandler } from './handlers/stop-app.handler';
import { UninstallAppHandler } from './handlers/uninstall-app.handler';
import { UpdateAppHandler } from './handlers/update-app.handler';
import { UpdateConfigHandler } from './handlers/update-config.handler';

@Injectable()
export class AppLifecycleService {
  constructor(
    private readonly logger: LoggerService,
    private readonly appEventsQueue: AppEventsQueue,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly appRepository: AppsRepository,
    private readonly appsService: AppsService,
    @Inject(APP_ASYNC_MUTEX) private mutex: AsyncMutex,
    private readonly startAppHandler: StartAppHandler,
    private readonly stopAppHandler: StopAppHandler,
    private readonly restartAppHandler: RestartAppHandler,
    private readonly installAppHandler: InstallAppHandler,
    private readonly uninstallAppHandler: UninstallAppHandler,
    private readonly resetAppHandler: ResetAppHandler,
    private readonly updateConfigHandler: UpdateConfigHandler,
    private readonly updateAppHandler: UpdateAppHandler,
  ) {
    this.logger.debug('Subscribing to app events...');
    this.appEventsQueue.onEvent((data, reply) => this.invokeCommand(data, reply));
  }

  async invokeCommand(data: typeof appEventSchema.infer, reply: (response: typeof appEventResultSchema.infer) => Promise<void>) {
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

  async startApp(params: { appUrn: AppUrn; skipPull?: boolean }) {
    return this.startAppHandler.execute(params.appUrn, { skipPull: params.skipPull });
  }

  async installApp(params: { appUrn: AppUrn; form: unknown; skipRun?: boolean }) {
    return this.installAppHandler.execute(params.appUrn, { form: params.form, skipRun: params.skipRun });
  }

  public async stopApp(params: { appUrn: AppUrn }) {
    return this.stopAppHandler.execute(params.appUrn);
  }

  public async restartApp(params: { appUrn: AppUrn; skipPull?: boolean }) {
    return this.restartAppHandler.execute(params.appUrn, { skipPull: params.skipPull });
  }

  public async uninstallApp(params: { appUrn: AppUrn; removeBackups: boolean }) {
    return this.uninstallAppHandler.execute(params.appUrn, { removeBackups: params.removeBackups });
  }

  public async resetApp(params: { appUrn: AppUrn }) {
    return this.resetAppHandler.execute(params.appUrn);
  }

  public async updateAppSettings(params: { appUrn: AppUrn; form: unknown }) {
    return this.updateConfigHandler.execute(params.appUrn, { form: params.form });
  }

  public async updateApp(params: { appUrn: AppUrn; performBackup: boolean }) {
    return this.updateAppHandler.execute(params.appUrn, { performBackup: params.performBackup });
  }

  async updateAllApps() {
    const installedApps = await this.appsService.getInstalledApps();
    const availableUpdates = installedApps.filter(
      ({ app, metadata }) => Number(app.version) < Number(metadata.latestVersion) && app.ignoredVersion !== metadata.latestVersion,
    );

    for (const { app } of availableUpdates) {
      try {
        const appUrn = createAppUrn(app.appName, app.appStoreSlug);
        await this.updateApp({ appUrn, performBackup: true });
      } catch (e) {
        this.logger.error(`Failed to update app ${app.id}`, e);
      }
    }
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

  async startAllApps() {
    const apps = await this.appRepository.getApps();
    const stoppedApps = apps.filter((app) => app.status === 'stopped');

    (async () => {
      for (const app of stoppedApps) {
        try {
          const appUrn = createAppUrn(app.appName, app.appStoreSlug);
          await this.startApp({ appUrn, skipPull: true });
        } catch (e) {
          this.logger.error(`Failed to start app ${app.id}`, e);
        }
      }
    })();
  }

  async stopAllApps() {
    const apps = await this.appRepository.getApps();
    const runningApps = apps.filter((app) => app.status === 'running');

    (async () => {
      for (const app of runningApps) {
        try {
          const appUrn = createAppUrn(app.appName, app.appStoreSlug);
          await this.stopApp({ appUrn });
        } catch (e) {
          this.logger.error(`Failed to stop app ${app.id}`, e);
        }
      }
    })();
  }

  async restartAllApps() {
    const apps = await this.appRepository.getApps();
    const runningApps = apps.filter((app) => app.status === 'running');

    (async () => {
      for (const app of runningApps) {
        try {
          const appUrn = createAppUrn(app.appName, app.appStoreSlug);
          await this.restartApp({ appUrn });
        } catch (e) {
          this.logger.error(`Failed to restart app ${app.id}`, e);
        }
      }
    })();
  }
}
