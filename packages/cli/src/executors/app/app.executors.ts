import { appInfoSchema } from '@runtipi/shared';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getEnv } from '@/utils/environment/environment';
import { pathExists } from '@/utils/fs-helpers';
import { compose } from '@/utils/docker-helpers';
import { copyDataDir, generateEnvFile } from './app.helpers';
import { fileLogger } from '@/utils/logger/file-logger';

const execAsync = promisify(exec);

export class AppExecutors {
  private readonly rootFolderHost: string;

  private readonly storagePath: string;

  private readonly appsRepoId: string;

  private readonly logger;

  constructor() {
    const { rootFolderHost, storagePath, appsRepoId } = getEnv();
    this.rootFolderHost = rootFolderHost;
    this.storagePath = storagePath;
    this.appsRepoId = appsRepoId;
    this.logger = fileLogger;
  }

  private handleAppError = (err: unknown) => {
    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

    return { success: false, message: `An error occurred: ${err}` };
  };

  private getAppPaths = (appId: string) => {
    const appDataDirPath = path.join(this.storagePath, 'app-data', appId);
    const appDirPath = path.join(this.rootFolderHost, 'apps', appId);
    const configJsonPath = path.join(appDirPath, 'config.json');
    const repoPath = path.join(this.rootFolderHost, 'repos', this.appsRepoId, 'apps', appId);

    return { appDataDirPath, appDirPath, configJsonPath, repoPath };
  };

  // private ensurePermissions = async (appId: string) => {
  //   const { appDataDirPath, configJsonPath } = this.getAppPaths(appId);
  //   if (!(await pathExists(appDataDirPath))) {
  //     this.logger.info(`Creating app ${appId} data dir`);
  //     await fs.promises.mkdir(appDataDirPath, { recursive: true });
  //   }

  //   // Check if app requires special uid and gid
  //   if (await pathExists(configJsonPath)) {
  //     const config = appInfoSchema.parse(JSON.parse(await fs.promises.readFile(configJsonPath, 'utf-8')));
  //     const { uid, gid } = config;

  //     if (uid && gid) {
  //       this.logger.info(`Setting uid and gid to ${uid}:${gid}`);
  //       await execAsync(`chown -R ${uid}:${gid} ${path.join(appDataDirPath, 'data')}`);
  //     }
  //   }

  //   // Remove all .gitkeep files from app data dir
  //   await execAsync(`find ${appDataDirPath} -name '.gitkeep' -exec rm -f {} \\;`);
  // };

  /**
   * Given an app id, ensures that the app folder exists in the apps folder
   * If not, copies the app folder from the repo
   * @param {string} appId - App id
   */
  private ensureAppDir = async (appId: string) => {
    const { appDirPath, repoPath } = this.getAppPaths(appId);
    const dockerFilePath = path.join(this.rootFolderHost, 'apps', appId, 'docker-compose.yml');

    if (!(await pathExists(dockerFilePath))) {
      // delete eventual app folder if exists
      this.logger.info(`Deleting app ${appId} folder if exists`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true });

      // Copy app folder from repo
      this.logger.info(`Copying app ${appId} from repo ${getEnv().appsRepoId}`);
      await fs.promises.cp(repoPath, appDirPath, { recursive: true });
    }
  };

  /**
   * Install an app from the repo
   * @param {string} appId - The id of the app to install
   * @param {Record<string, unknown>} config - The config of the app
   */
  public installApp = async (appId: string, config: Record<string, unknown>) => {
    try {
      const { appDirPath, repoPath, appDataDirPath } = this.getAppPaths(appId);
      this.logger.info(`Installing app ${appId}`);

      // Check if app exists in repo
      const apps = await fs.promises.readdir(path.join(this.rootFolderHost, 'repos', this.appsRepoId, 'apps'));

      if (!apps.includes(appId)) {
        this.logger.error(`App ${appId} not found in repo ${this.appsRepoId}`);
        return { success: false, message: `App ${appId} not found in repo ${this.appsRepoId}` };
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

      // Create folder app-data folder
      this.logger.info(`Creating folder ${appDataDirPath}`);
      await fs.promises.mkdir(appDataDirPath, { recursive: true });

      // Create app.env file
      this.logger.info(`Creating app.env file for app ${appId}`);
      await generateEnvFile(appId, config);

      // Copy data dir
      this.logger.info(`Copying data dir for app ${appId}`);
      if (!(await pathExists(`${appDataDirPath}/data`))) {
        await copyDataDir(appId);
      }

      // await this.ensurePermissions(appId);

      // run docker-compose up
      this.logger.info(`Running docker-compose up for app ${appId}`);
      await compose(appId, 'up -d');

      this.logger.info(`Docker-compose up for app ${appId} finished`);
      return { success: true, message: `App ${appId} installed successfully` };
    } catch (err) {
      return this.handleAppError(err);
    }
  };

  /**
   * Stops an app
   * @param {string} appId - The id of the app to stop
   * @param {Record<string, unknown>} config - The config of the app
   */
  public stopApp = async (appId: string, config: Record<string, unknown>, skipEnvGeneration = false) => {
    try {
      this.logger.info(`Stopping app ${appId}`);

      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId);

      if (!skipEnvGeneration) {
        await generateEnvFile(appId, config);
      }
      await compose(appId, 'rm --force --stop');

      this.logger.info(`App ${appId} stopped`);
      return { success: true, message: `App ${appId} stopped successfully` };
    } catch (err) {
      return this.handleAppError(err);
    }
  };

  public startApp = async (appId: string, config: Record<string, unknown>) => {
    try {
      this.logger.info(`Starting app ${appId}`);

      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId);
      await generateEnvFile(appId, config);
      await compose(appId, 'up --detach --force-recreate --remove-orphans');

      this.logger.info(`App ${appId} started`);
      return { success: true, message: `App ${appId} started successfully` };
    } catch (err) {
      return this.handleAppError(err);
    }
  };

  public uninstallApp = async (appId: string, config: Record<string, unknown>) => {
    try {
      const { appDirPath, appDataDirPath } = this.getAppPaths(appId);
      this.logger.info(`Uninstalling app ${appId}`);

      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId);
      await generateEnvFile(appId, config);
      await compose(appId, 'down --remove-orphans --volumes --rmi all');

      this.logger.info(`Deleting folder ${appDirPath}`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true });

      this.logger.info(`Deleting folder ${appDataDirPath}`);
      await fs.promises.rm(appDataDirPath, { recursive: true, force: true });

      this.logger.info(`App ${appId} uninstalled`);
      return { success: true, message: `App ${appId} uninstalled successfully` };
    } catch (err) {
      return this.handleAppError(err);
    }
  };

  public updateApp = async (appId: string, config: Record<string, unknown>) => {
    try {
      const { appDirPath, repoPath } = this.getAppPaths(appId);
      this.logger.info(`Updating app ${appId}`);
      await this.ensureAppDir(appId);
      await generateEnvFile(appId, config);

      await compose(appId, 'up --detach --force-recreate --remove-orphans');
      await compose(appId, 'down --rmi all --remove-orphans');

      this.logger.info(`Deleting folder ${appDirPath}`);
      await fs.promises.rm(appDirPath, { recursive: true, force: true });

      this.logger.info(`Copying folder ${repoPath} to ${appDirPath}`);
      await fs.promises.cp(repoPath, appDirPath, { recursive: true });

      // await this.ensurePermissions(appId);

      await compose(appId, 'pull');

      return { success: true, message: `App ${appId} updated successfully` };
    } catch (err) {
      return this.handleAppError(err);
    }
  };

  public regenerateAppEnv = async (appId: string, config: Record<string, unknown>) => {
    try {
      this.logger.info(`Regenerating app.env file for app ${appId}`);
      await this.ensureAppDir(appId);
      await generateEnvFile(appId, config);
      return { success: true, message: `App ${appId} env file regenerated successfully` };
    } catch (err) {
      return this.handleAppError(err);
    }
  };
}
