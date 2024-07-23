/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import path from 'path';
import * as Sentry from '@sentry/node';
import { execAsync, pathExists } from '@runtipi/shared/node';
import { AppEventForm, SocketEvent, appInfoSchema, sanitizePath } from '@runtipi/shared';
import { copyDataDir, generateEnvFile } from './app.helpers';
import { logger } from '@/lib/logger';
import { compose } from '@/lib/docker';
import { getEnv } from '@/lib/environment';
import { SocketManager } from '@/lib/socket/SocketManager';
import { getDbClient } from '@/lib/db';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { getDockerCompose } from '@/config/docker-templates';
import { ArchiveManager } from '@/lib/archive/ArchiveManager';

export class AppExecutors {
  private readonly logger;
  private archiveManager: ArchiveManager;

  constructor() {
    this.logger = logger;
    this.archiveManager = new ArchiveManager();
  }

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
      await SocketManager.emit({
        type: 'app',
        event,
        data: { appId, error: err.message, appStatus: newStatus },
      });
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

    await SocketManager.emit({
      type: 'app',
      event,
      data: { appId, error: String(err), appStatus: newStatus },
    });
    return { success: false, message: `An error occurred: ${String(err)}` };
  };

  private getAppPaths = (appId: string) => {
    const { appsRepoId } = getEnv();

    const appDataDirPath = path.join(APP_DATA_DIR, sanitizePath(appId));
    const appDirPath = path.join(DATA_DIR, 'apps', sanitizePath(appId));
    const configJsonPath = path.join(appDirPath, 'config.json');
    const repoPath = path.join(DATA_DIR, 'repos', appsRepoId, 'apps', sanitizePath(appId));

    return { appDataDirPath, appDirPath, configJsonPath, repoPath };
  };

  /**
   * Given an app id, ensures that the app folder exists in the apps folder
   * If not, copies the app folder from the repo
   * @param {string} appId - App id
   */
  private ensureAppDir = async (appId: string, form: AppEventForm) => {
    const { appDirPath, appDataDirPath, repoPath } = this.getAppPaths(appId);
    const dockerFilePath = path.join(DATA_DIR, 'apps', sanitizePath(appId), 'docker-compose.yml');

    if (!(await pathExists(dockerFilePath))) {
      // delete eventual app folder if exists
      this.logger.info(`Deleting app ${appId} folder if exists`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true });

      // Copy app folder from repo
      this.logger.info(`Copying app ${appId} from repo ${getEnv().appsRepoId}`);
      await fs.promises.cp(repoPath, appDirPath, { recursive: true });
    }

    // Check if app has a docker-compose.json file
    if (await pathExists(path.join(repoPath, 'docker-compose.json'))) {
      try {
        // Generate docker-compose.yml file
        const rawComposeConfig = await fs.promises.readFile(
          path.join(repoPath, 'docker-compose.json'),
          'utf-8',
        );
        const jsonComposeConfig = JSON.parse(rawComposeConfig);

        const composeFile = getDockerCompose(jsonComposeConfig.services, form);

        await fs.promises.writeFile(dockerFilePath, composeFile);
      } catch (err) {
        this.logger.error(
          `Error generating docker-compose.yml file for app ${appId}. Falling back to default docker-compose.yml`,
        );
        this.logger.error(err);
        Sentry.captureException(err);
      }
    }

    // Set permissions
    await execAsync(`chmod -Rf a+rwx ${path.join(appDataDirPath)}`).catch((e) => {
      this.logger.error(`Error setting permissions for app ${appId}`);
      Sentry.captureException(e);
    });
  };

  public regenerateAppEnv = async (appId: string, form: AppEventForm) => {
    try {
      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);

      await SocketManager.emit({ type: 'app', event: 'generate_env_success', data: { appId } });
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
  public installApp = async (appId: string, form: AppEventForm) => {
    try {
      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'installing' },
      });

      if (process.getuid && process.getgid) {
        this.logger.info(
          `Installing app ${appId} as User ID: ${process.getuid()}, Group ID: ${process.getgid()}`,
        );
      } else {
        this.logger.info(`Installing app ${appId}. No User ID or Group ID found.`);
      }

      const { appsRepoId } = getEnv();

      const { appDirPath, repoPath, appDataDirPath } = this.getAppPaths(appId);

      // Check if app exists in repo
      const apps = await fs.promises.readdir(
        path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps'),
      );

      if (!apps.includes(appId)) {
        this.logger.error(`App ${appId} not found in repo ${appsRepoId}`);
        return { success: false, message: `App ${appId} not found in repo ${appsRepoId}` };
      }

      // Delete app folder if exists
      this.logger.info(`Deleting folder ${appDirPath} if exists`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true });

      // Create app folder
      this.logger.info(`Creating folder ${appDirPath}`);
      await fs.promises.mkdir(appDirPath, { recursive: true });

      // Copy app folder from repo
      this.logger.info(`Copying folder ${repoPath} to ${appDirPath}`);
      await fs.promises.cp(repoPath, appDirPath, { recursive: true });

      // Create app-data folder
      this.logger.info(`Creating folder ${appDataDirPath}`);
      await fs.promises.mkdir(appDataDirPath, { recursive: true });

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await generateEnvFile(appId, form);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appId}`);
      if (!(await pathExists(`${appDataDirPath}/data`))) {
        await copyDataDir(appId);
      }

      await this.ensureAppDir(appId, form);

      // run docker-compose up
      this.logger.info(`Running docker-compose up for app ${appId}`);
      await compose(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`Docker-compose up for app ${appId} finished`);

      await SocketManager.emit({
        type: 'app',
        event: 'install_success',
        data: { appId, appStatus: 'running' },
      });

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
  public stopApp = async (appId: string, form: AppEventForm, skipEnvGeneration = false) => {
    try {
      const { appDirPath } = this.getAppPaths(appId);
      const configJsonPath = path.join(appDirPath, 'config.json');
      const isActualApp = await pathExists(configJsonPath);

      if (!isActualApp) {
        return { success: true, message: `App ${appId} is not an app. Skipping...` };
      }

      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'stopping' },
      });
      this.logger.info(`Stopping app ${appId}`);

      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }
      await compose(appId, 'rm --force --stop');

      this.logger.info(`App ${appId} stopped`);

      await SocketManager.emit({
        type: 'app',
        event: 'stop_success',
        data: { appId, appStatus: 'stopped' },
      });

      const client = await getDbClient();
      await client?.query('UPDATE app SET status = $1 WHERE id = $2', ['stopped', appId]);
      return { success: true, message: `App ${appId} stopped successfully` };
    } catch (err) {
      console.error(err);
      return this.handleAppError(err, appId, 'stop_error', 'running');
    }
  };

  public restartApp = async (appId: string, form: AppEventForm, skipEnvGeneration = false) => {
    try {
      const { appDirPath } = this.getAppPaths(appId);
      const configJsonPath = path.join(appDirPath, 'config.json');
      const isActualApp = await pathExists(configJsonPath);

      if (!isActualApp) {
        return { success: true, message: `App ${appId} is not an app. Skipping...` };
      }

      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'restarting' },
      });

      this.logger.info(`Restarting app ${appId}`);

      this.logger.info(`Stopping app ${appId}`);

      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }

      await compose(appId, 'rm --force --stop');

      this.logger.info(`Starting app ${appId}`);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }

      await compose(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appId} started`);

      this.logger.info(`App ${appId} restarted`);

      await SocketManager.emit({
        type: 'app',
        event: 'restart_success',
        data: { appId, appStatus: 'running' },
      });

      return { success: true, message: `App ${appId} restarted successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'restart_error', 'stopped');
    }
  };

  public startApp = async (appId: string, form: AppEventForm, skipEnvGeneration = false) => {
    try {
      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'starting' },
      });

      this.logger.info(`Starting app ${appId}`);

      await this.ensureAppDir(appId, form);

      if (!skipEnvGeneration) {
        this.logger.info(`Regenerating app.env file for app ${appId}`);
        await generateEnvFile(appId, form);
      }

      await compose(appId, 'up --detach --force-recreate --remove-orphans --pull always');

      this.logger.info(`App ${appId} started`);

      await SocketManager.emit({
        type: 'app',
        event: 'start_success',
        data: { appId, appStatus: 'running' },
      });

      const client = await getDbClient();
      await client?.query('UPDATE app SET status = $1 WHERE id = $2', ['running', appId]);
      return { success: true, message: `App ${appId} started successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'start_error', 'stopped');
    }
  };

  public uninstallApp = async (appId: string, form: AppEventForm) => {
    try {
      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'uninstalling' },
      });

      const { appDirPath, appDataDirPath } = this.getAppPaths(appId);
      this.logger.info(`Uninstalling app ${appId}`);

      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);
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

      this.logger.info(`Deleting folder ${appDirPath}`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true }).catch((err) => {
        this.logger.error(`Error deleting folder ${appDirPath}: ${err.message}`);
      });

      this.logger.info(`Deleting folder ${appDataDirPath}`);
      await fs.promises.rm(appDataDirPath, { recursive: true, force: true }).catch((err) => {
        this.logger.error(`Error deleting folder ${appDataDirPath}: ${err.message}`);
      });

      this.logger.info(`App ${appId} uninstalled`);

      await SocketManager.emit({
        type: 'app',
        event: 'uninstall_success',
        data: { appId, appStatus: 'missing' },
      });

      const client = await getDbClient();
      await client?.query(`DELETE FROM app WHERE id = $1`, [appId]);
      return { success: true, message: `App ${appId} uninstalled successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'uninstall_error', 'stopped');
    }
  };

  public resetApp = async (appId: string, form: AppEventForm) => {
    try {
      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'resetting' },
      });

      const { appDataDirPath } = this.getAppPaths(appId);
      this.logger.info(`Resetting app ${appId}`);
      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);

      // Stop app
      try {
        await compose(appId, 'down --remove-orphans --volumes');
      } catch (err) {
        if (err instanceof Error && err.message.includes('conflict')) {
          this.logger.warn(
            `Could not reset app ${appId}. Most likely there have been made changes to the compose file.`,
          );
        } else {
          throw err;
        }
      }

      // Delete app data directory
      this.logger.info(`Deleting folder ${appDataDirPath}`);
      await fs.promises.rm(appDataDirPath, { recursive: true, force: true }).catch((err) => {
        this.logger.error(`Error deleting folder ${appDataDirPath}: ${err.message}`);
      });

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await generateEnvFile(appId, form);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appId}`);
      if (!(await pathExists(`${appDataDirPath}/data`))) {
        await copyDataDir(appId);
      }

      await this.ensureAppDir(appId, form);

      // run docker-compose up
      this.logger.info(`Running docker-compose up for app ${appId}`);
      await compose(appId, 'up -d');

      await SocketManager.emit({
        type: 'app',
        event: 'reset_success',
        data: { appId, appStatus: 'running' },
      });

      const client = await getDbClient();
      await client?.query(`UPDATE app SET status = $1 WHERE id = $2`, ['running', appId]);
      return { success: true, message: `App ${appId} reset successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'reset_error', 'stopped');
    }
  };

  public updateApp = async (appId: string, form: AppEventForm) => {
    try {
      // Creating backup of the app before updating
      await this.backupApp(appId);

      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'updating' },
      });

      const { appDirPath, repoPath } = this.getAppPaths(appId);
      this.logger.info(`Updating app ${appId}`);
      await this.ensureAppDir(appId, form);
      await generateEnvFile(appId, form);

      try {
        await compose(appId, 'up --detach --force-recreate --remove-orphans');
        await compose(appId, 'down --rmi all --remove-orphans');
      } catch (err) {
        logger.warn(
          `App ${appId} has likely a broken docker-compose.yml file. Continuing with update...`,
        );
      }

      this.logger.info(`Deleting folder ${appDirPath}`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true });

      this.logger.info(`Copying folder ${repoPath} to ${appDirPath}`);
      await fs.promises.cp(repoPath, appDirPath, { recursive: true });

      await this.ensureAppDir(appId, form);

      await compose(appId, 'pull');

      await SocketManager.emit({
        type: 'app',
        event: 'update_success',
        data: { appId, appStatus: 'stopped' },
      });

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
      const client = await getDbClient();
      let rows: { id: string; config: Record<string, unknown> }[] = [];

      if (!forceStartAll) {
        // Get all apps with status running
        const result = await client?.query(`SELECT * FROM app WHERE status = 'running'`);
        rows = result?.rows || [];
      } else {
        // Get all apps
        const result = await client?.query(`SELECT * FROM app`);
        rows = result?.rows || [];
      }

      // Update all apps with status different than running or stopped to stopped
      await client?.query(
        `UPDATE app SET status = 'stopped' WHERE status != 'stopped' AND status != 'running' AND status != 'missing'`,
      );

      // Start all apps
      for (const row of rows) {
        const { id, config } = row;

        const { success } = await this.startApp(id, config as AppEventForm);

        if (!success) {
          this.logger.error(`Error starting app ${id}`);
          await client?.query(`UPDATE app SET status = $1 WHERE id = $2`, ['stopped', id]);
        } else {
          await client?.query(`UPDATE app SET status = $1 WHERE id = $2`, ['running', id]);
        }
      }
    } catch (err) {
      this.logger.error(`Error starting apps: ${err}`);
    }
  };

  public backupApp = async (appId: string) => {
    try {
      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'backing_up' },
      });

      const { appDataDirPath, appDirPath } = this.getAppPaths(appId);
      const backupName = `${appId}-${new Date().getTime()}`;
      const backupDir = path.join(DATA_DIR, 'backups', appId);
      const tempDir = path.join('/tmp', appId);

      // Stop app so containers like databases don't cause problems
      this.logger.info(`Stopping app ${appId}`);

      await compose(appId, 'rm --force --stop');

      this.logger.info('App stopped!');

      this.logger.info('Copying files to backup location...');

      // Ensure backup directory exists
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Move app data and app directories
      await fs.promises.cp(appDataDirPath, path.join(tempDir, 'app-data'), {
        recursive: true,
        filter: (src) => !src.includes('backups'),
      });
      await fs.promises.cp(appDirPath, path.join(tempDir, 'app'), { recursive: true });

      // Check if the user config folder exists and if it does copy it too
      if (await pathExists(path.join(DATA_DIR, 'user-config', appId))) {
        await fs.promises.cp(
          path.join(DATA_DIR, 'user-config', appId),
          path.join(tempDir, 'user-config'),
        );
      }

      this.logger.info('Creating archive...');

      // Create the archive
      await this.archiveManager.createTarGz(tempDir, `${path.join(tempDir, backupName)}.tar.gz`);

      // await execAsync(`tar -czpf ${path.join(tempDir, backupName)}.tar.gz -C ${tempDir} .`);

      this.logger.info('Moving archive to backup directory...');

      // Move the archive to the backup directory
      await fs.promises.mkdir(backupDir, { recursive: true });
      await fs.promises.cp(
        path.join(tempDir, `${backupName}.tar.gz`),
        path.join(backupDir, `${backupName}.tar.gz`),
      );

      // Remove the temp backup folder
      await fs.promises.rm(tempDir, { force: true, recursive: true });

      this.logger.info('Backup completed!');

      // Done
      await SocketManager.emit({
        type: 'app',
        event: 'backup_success',
        data: { appId, appStatus: 'stopped' },
      });
      return { success: true, message: `App ${appId} backed up successfully` };
    } catch (err) {
      return this.handleAppError(err, appId, 'backup_error');
    }
  };

  public restoreApp = async (appId: string, filename: string) => {
    try {
      await SocketManager.emit({
        type: 'app',
        event: 'status_change',
        data: { appId, appStatus: 'restoring' },
      });

      const { appDataDirPath, appDirPath } = this.getAppPaths(appId);
      const restoreDir = path.join('/tmp', appId);
      const archive = path.join(DATA_DIR, 'backups', appId, filename);
      const client = await getDbClient();

      this.logger.info('Restoring app from backup...');

      // Verify the app has a backup
      if (!(await pathExists(archive))) {
        throw new Error('The backup file does not exist');
      }

      // Stop the app
      this.logger.info(`Stopping app ${appId}`);

      // Simulate 10 seconds of waiting for the app to stop
      await new Promise((resolve) => setTimeout(resolve, 10000));

      await compose(appId, 'rm --force --stop');

      this.logger.info('App stopped!');

      // Unzip the archive
      await fs.promises.mkdir(restoreDir, { recursive: true });
      await this.archiveManager.extractTarGz(archive, restoreDir);

      // Remove old data directories
      await fs.promises.rm(appDataDirPath, { force: true, recursive: true });
      await fs.promises.rm(appDirPath, { force: true, recursive: true });
      await fs.promises.rm(path.join(DATA_DIR, 'user-config', appId), {
        force: true,
        recursive: true,
      });

      await fs.promises.mkdir(appDataDirPath, { recursive: true });
      await fs.promises.mkdir(appDirPath, { recursive: true });

      // Copy data from the backup folder
      await fs.promises.cp(path.join(restoreDir, 'app'), appDirPath, { recursive: true });
      await fs.promises.cp(path.join(restoreDir, 'app-data'), appDataDirPath, { recursive: true });

      // Copy user config foler if it exists
      if (await pathExists(path.join(restoreDir, 'user-config'))) {
        await fs.promises.cp(
          path.join(restoreDir, 'user-config'),
          path.join(DATA_DIR, 'user-config', appId),
          { recursive: true },
        );
      }

      // Delete restore folder
      await fs.promises.rm(restoreDir, { force: true, recursive: true });

      // Set the version in the database
      const configFileRaw = await fs.promises.readFile(path.join(appDirPath, 'config.json'), {
        encoding: 'utf-8',
      });
      const configParsed = appInfoSchema.safeParse(JSON.parse(configFileRaw));
      await client?.query(`UPDATE app SET version = $1 WHERE id = $2`, [
        configParsed.data?.tipi_version,
        appId,
      ]);

      this.logger.info(`App ${appId} restored!`);

      // Done
      await SocketManager.emit({
        type: 'app',
        event: 'restore_success',
        data: { appId, appStatus: 'stopped' },
      });

      return { success: true, message: `App ${appId} restored successfully` };
    } catch (err) {
      console.error(err);
      return this.handleAppError(err, appId, 'restore_error');
    }
  };
}
