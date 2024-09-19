import { getDockerCompose } from '@/config/docker-templates';
import { compose } from '@/lib/docker';
import type { ISocketManager } from '@/lib/socket/SocketManager';
import { type App, type IDbClient, appTable } from '@runtipi/db';
import type { AppEventForm, AppEventFormInput, SocketEvent } from '@runtipi/shared';
import type { IAppFileAccessor, IBackupManager, ILogger } from '@runtipi/shared/node';
import * as Sentry from '@sentry/node';
import { and, eq, ne } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { generateEnvFile } from './app.helpers';
import { getAppEnvMap } from './env.helpers';

export interface IAppExecutors {
  regenerateAppEnv: (appId: string, form: AppEventFormInput) => Promise<{ success: boolean; message: string }>;
  installApp: (appId: string, form: AppEventFormInput) => Promise<{ success: boolean; message: string }>;
  stopApp: (appId: string, form: AppEventFormInput, skipEnvGeneration?: boolean) => Promise<{ success: boolean; message: string }>;
  restartApp: (appId: string, form: AppEventFormInput, skipEnvGeneration?: boolean) => Promise<{ success: boolean; message: string }>;
  startApp: (appId: string, form: AppEventFormInput, skipEnvGeneration?: boolean) => Promise<{ success: boolean; message: string }>;
  uninstallApp: (appId: string, form: AppEventFormInput) => Promise<{ success: boolean; message: string }>;
  resetApp: (appId: string, form: AppEventFormInput) => Promise<{ success: boolean; message: string }>;
  updateApp: (appId: string, form: AppEventFormInput, performBackup: boolean) => Promise<{ success: boolean; message: string }>;
  startAllApps: (forceStartAll?: boolean) => Promise<void>;
  backupApp: (appId: string) => Promise<{ success: boolean; message: string }>;
  restoreApp: (appId: string, filename: string) => Promise<{ success: boolean; message: string }>;
}

@injectable()
export class AppExecutors implements IAppExecutors {
  constructor(
    @inject('ILogger') private logger: ILogger,
    @inject('IDbClient') private dbClient: IDbClient,
    @inject('ISocketManager') private socketManager: ISocketManager,
    @inject('IAppFileAccessor') private appFileAccessor: IAppFileAccessor,
    @inject('IBackupManager') private backupManager: IBackupManager,
  ) {}

  private handleAppError = async (
    err: unknown,
    appId: string,
    event: Extract<SocketEvent, { type: 'app' }>['event'],
    newStatus?: Extract<SocketEvent, { type: 'app' }>['data']['appStatus'],
  ) => {
    Sentry.captureException(err, {
      tags: { appId, event },
    });

    if (err instanceof Error) {
      await this.socketManager.emit({ type: 'app', event, data: { appId, error: err.message, appStatus: newStatus } });
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

    await this.socketManager.emit({ type: 'app', event, data: { appId, error: String(err), appStatus: newStatus } });
    return { success: false, message: `An error occurred: ${String(err)}` };
  };

  /**
   * Given an app id, ensures that the app folder exists in the apps folder
   * If not, copies the app folder from the repo
   * @param {string} appId - App id
   */
  private ensureAppDir = async (appId: string, form: AppEventFormInput) => {
    const composeFile = await this.appFileAccessor.getInstalledAppDockerComposeYaml(appId);

    if (!composeFile) {
      await this.appFileAccessor.copyAppFromRepoToInstalled(appId);
    }

    const rawComposeConfig = await this.appFileAccessor.getInstalledAppDockerComposeJson(appId);
    if (rawComposeConfig) {
      try {
        const composeFile = getDockerCompose(rawComposeConfig.services, form);

        await this.appFileAccessor.writeDockerComposeYml(appId, composeFile);
      } catch (err) {
        this.logger.error(`Error generating docker-compose.yml file for app ${appId}. Falling back to default docker-compose.yml`);
        this.logger.error(err);
        Sentry.captureException(err);
      }
    }

    // Set permissions
    await this.appFileAccessor.setAppDataDirPermissions(appId);
  };

  public regenerateAppEnv = async (appId: string, form: AppEventFormInput) => {
    try {
      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);

      await this.socketManager.emit({ type: 'app', event: 'generate_env_success', data: { appId } });
      return { success: true, message: `App ${appId} env file regenerated successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'generate_env_error');
    }
  };

  /**
   * Install an app from the repo
   * @param {string} appId - The id of the app to install
   * @param {AppEventForm} form - The config of the app
   */
  public installApp = async (appId: string, form: AppEventFormInput) => {
    try {
      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'installing' } });

      if (process.getuid && process.getgid) {
        this.logger.info(`Installing app ${appId} as User ID: ${process.getuid()}, Group ID: ${process.getgid()}`);
      } else {
        this.logger.info(`Installing app ${appId}. No User ID or Group ID found.`);
      }

      await this.appFileAccessor.copyAppFromRepoToInstalled(appId);

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await generateEnvFile(appId, form);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appId}`);
      const envMap = await getAppEnvMap(appId);
      await this.appFileAccessor.copyDataDir(appId, envMap);

      await this.ensureAppDir(appId, form);

      // run docker-compose up
      await compose(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      await this.socketManager.emit({ type: 'app', event: 'install_success', data: { appId, appStatus: 'running' } });

      return { success: true, message: `App ${appId} installed successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'install_error', 'missing');
    }
  };

  /**
   * Stops an app
   * @param {string} appId - The id of the app to stop
   * @param {Record<string, unknown>} form - The config of the app
   */
  public stopApp = async (appId: string, form: AppEventFormInput, skipEnvGeneration = false) => {
    try {
      const config = await this.appFileAccessor.getInstalledAppInfo(appId);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'stopping' } });
      this.logger.info(`Stopping app ${appId}`);

      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }
      await compose(appId, 'rm --force --stop');

      this.logger.info(`App ${appId} stopped`);

      await this.socketManager.emit({
        type: 'app',
        event: 'stop_success',
        data: { appId, appStatus: 'stopped' },
      });

      await this.dbClient.db.update(appTable).set({ status: 'stopped' }).where(eq(appTable.id, appId));

      return { success: true, message: `App ${appId} stopped successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'stop_error', 'running');
    }
  };

  public restartApp = async (appId: string, form: AppEventFormInput, skipEnvGeneration = false) => {
    try {
      const config = await this.appFileAccessor.getInstalledAppInfo(appId);

      if (!config) {
        return { success: true, message: 'App config not found. Skipping...' };
      }

      await this.ensureAppDir(appId, form);

      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'restarting' } });

      this.logger.info(`Stopping app ${appId}`);

      await compose(appId, 'rm --force --stop');
      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }

      await compose(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appId} restarted`);

      await this.socketManager.emit({ type: 'app', event: 'restart_success', data: { appId, appStatus: 'running' } });

      return { success: true, message: `App ${appId} restarted successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'restart_error', 'stopped');
    }
  };

  public startApp = async (appId: string, form: AppEventFormInput, skipEnvGeneration = false) => {
    try {
      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'starting' } });

      this.logger.info(`Starting app ${appId}`);

      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }

      await compose(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appId} started`);

      await this.socketManager.emit({ type: 'app', event: 'start_success', data: { appId, appStatus: 'running' } });

      await this.dbClient.db.update(appTable).set({ status: 'running' }).where(eq(appTable.id, appId));
      return { success: true, message: `App ${appId} started successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'start_error', 'stopped');
    }
  };

  public uninstallApp = async (appId: string, form: AppEventFormInput) => {
    try {
      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'uninstalling' } });

      this.logger.info(`Uninstalling app ${appId}`);
      await this.ensureAppDir(appId, form);

      try {
        await compose(appId, 'down --remove-orphans --volumes --rmi all');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          this.logger.warn(
            `Could not fully uninstall app ${appId}. Some images are in use by other apps. Consider cleaning unused images docker system prune -a`,
          );
        } else {
          throw err;
        }
      }

      await this.appFileAccessor.deleteAppFolder(appId);
      await this.appFileAccessor.deleteAppDataDir(appId);

      this.logger.info(`App ${appId} uninstalled`);

      await this.socketManager.emit({ type: 'app', event: 'uninstall_success', data: { appId, appStatus: 'missing' } });
      await this.dbClient.db.delete(appTable).where(eq(appTable.id, appId));

      return { success: true, message: `App ${appId} uninstalled successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'uninstall_error', 'stopped');
    }
  };

  public resetApp = async (appId: string, form: AppEventFormInput) => {
    try {
      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'resetting' } });

      this.logger.info(`Resetting app ${appId}`);

      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);

      // Stop app
      try {
        await compose(appId, 'down --remove-orphans --volumes');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          this.logger.warn(`Could not reset app ${appId}. Most likely there have been made changes to the compose file.`);
        } else {
          throw err;
        }
      }

      // Delete app data directory
      await this.appFileAccessor.deleteAppDataDir(appId);

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await generateEnvFile(appId, form);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appId}`);
      const envMap = await getAppEnvMap(appId);
      await this.appFileAccessor.copyDataDir(appId, envMap);

      await this.ensureAppDir(appId, form);

      // run docker-compose up
      this.logger.info(`Running docker-compose up for app ${appId}`);
      await compose(appId, 'up -d');

      await this.socketManager.emit({ type: 'app', event: 'reset_success', data: { appId, appStatus: 'running' } });
      await this.dbClient.db.update(appTable).set({ status: 'running' }).where(eq(appTable.id, appId));

      return { success: true, message: `App ${appId} reset successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'reset_error', 'stopped');
    }
  };

  public updateApp = async (appId: string, form: AppEventFormInput, performBackup: boolean) => {
    try {
      if (performBackup) {
        // Creating backup of the app before updating
        await this.backupApp(appId);
      }

      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'updating' } });

      this.logger.info(`Updating app ${appId}`);
      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);

      try {
        await compose(appId, 'up --detach --force-recreate --remove-orphans');
        await compose(appId, 'down --rmi all --remove-orphans');
      } catch (err) {
        this.logger.warn(`App ${appId} has likely a broken docker-compose.yml file. Continuing with update...`);
      }

      await this.appFileAccessor.deleteAppFolder(appId);
      await this.appFileAccessor.copyAppFromRepoToInstalled(appId);

      await this.ensureAppDir(appId, form);

      await compose(appId, 'pull');

      await this.socketManager.emit({ type: 'app', event: 'update_success', data: { appId, appStatus: 'stopped' } });

      return { success: true, message: `App ${appId} updated successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'update_error', 'stopped');
    }
  };

  /**
   * Start all apps with status running
   */
  public startAllApps = async (forceStartAll = false) => {
    try {
      let apps: App[] = [];

      if (forceStartAll) {
        // Get all apps
        apps = await this.dbClient.db.select().from(appTable);
      } else {
        apps = await this.dbClient.db.select().from(appTable).where(eq(appTable.status, 'running'));
      }

      // Update all apps with status different than running or stopped to stopped
      await this.dbClient.db
        .update(appTable)
        .set({ status: 'stopped' })
        .where(and(ne(appTable.status, 'running'), ne(appTable.status, 'stopped'), ne(appTable.status, 'missing')));

      // Start all apps
      for (const row of apps) {
        const { id, config } = row;

        const { success } = await this.startApp(id, config as AppEventForm);

        if (success) {
          await this.dbClient.db.update(appTable).set({ status: 'running' }).where(eq(appTable.id, id));
        } else {
          this.logger.error(`Error starting app ${id}`);
          await this.dbClient.db.update(appTable).set({ status: 'stopped' }).where(eq(appTable.id, id));
        }
      }
    } catch (err) {
      this.logger.error(`Error starting apps: ${err}`);
    }
  };

  public backupApp = async (appId: string) => {
    try {
      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'backing_up' } });

      this.logger.info(`Stopping app ${appId}`);
      await compose(appId, 'rm --force --stop');
      this.logger.info('App stopped!');

      await this.backupManager.backupApp(appId);

      // Done
      this.logger.info('Backup completed!');
      await this.socketManager.emit({ type: 'app', event: 'backup_success', data: { appId, appStatus: 'stopped' } });
      return { success: true, message: `App ${appId} backed up successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'backup_error', 'stopped');
    }
  };

  public restoreApp = async (appId: string, filename: string) => {
    try {
      await this.socketManager.emit({ type: 'app', event: 'status_change', data: { appId, appStatus: 'restoring' } });

      // Stop the app
      this.logger.info(`Stopping app ${appId}`);
      await compose(appId, 'rm --force --stop');
      this.logger.info('App stopped!');

      await this.backupManager.restoreApp(appId, filename);

      // Set the version in the database
      const appInfo = await this.appFileAccessor.getInstalledAppInfo(appId);
      await this.dbClient.db.update(appTable).set({ version: appInfo?.tipi_version }).where(eq(appTable.id, appId));

      // Done
      await this.socketManager.emit({ type: 'app', event: 'restore_success', data: { appId, appStatus: 'stopped' } });
      this.logger.info(`App ${appId} restored!`);
      return { success: true, message: `App ${appId} restored successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'restore_error', 'stopped');
    }
  };
}
