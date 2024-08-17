import path, { parse } from 'node:path';
import fs from 'fs-extra';
import { sanitizePath } from '../../../../helpers/sanitizers';
import { appInfoSchema } from '../../../../schemas/app-schemas';
import { pathExists } from '../../../helpers/fs-helpers';
import { Logger } from '../../../logger/FileLogger';
import { repoSchema } from 'src/schemas/repo-schemas';
import { getRepoHash } from 'src/node/helpers/repo-helpers';

// Lower level data access class for apps
export class DataAccessApp {
  private dataDir: string;
  private appsRepoId: string;
  private logger: Logger;

  constructor(params: { dataDir: string; appDataDir: string; appsRepoId: string }) {
    this.dataDir = params.dataDir;
    this.appsRepoId = params.appsRepoId;
    this.logger = new Logger('data-access-app', path.join(params.dataDir, 'logs'));
  }

  private getInstalledAppsFolder() {
    return path.join(this.dataDir, 'apps');
  }

  private async getAppsRepoFolder(repoId: string) {
    return path.join(this.dataDir, 'repos', repoId, 'apps');
  }

  private async getRepoIdByName(name: string) {
    const repositories = await this.getRepositories();
    if (repositories[name]) {
      return getRepoHash(repositories[name]);
    }
    return '';
  }

  private async getRepositories() {
    try {
      const appStoresFilePath = path.join(this.dataDir, 'state', 'appstores.json');
      const appStoresFile = await fs.promises.readFile(appStoresFilePath, 'utf-8');
      const appStoresParsed = await repoSchema.safeParseAsync(JSON.parse(appStoresFile));
      if (appStoresParsed.success) {
        return appStoresParsed.data;
      }
      return { 'runtipi-default': 'https://github.com/runtipi/runtipi-appstore' };
    } catch {
      return { 'runtipi-default': 'https://github.com/runtipi/runtipi-appstore' };
    }
  }

  /**
   * Get the app info from the app store
   * @param id - The app id
   */
  public async getAppInfoFromAppStore(id: string, repo: string) {
    try {
      const repoAppFolder = path.join(
        await this.getAppsRepoFolder(await this.getRepoIdByName(repo)),
        sanitizePath(id),
      );

      if (await pathExists(path.join(repoAppFolder, 'config.json'))) {
        const configFile = await fs.promises.readFile(
          path.join(repoAppFolder, 'config.json'),
          'utf8',
        );
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile));

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = await fs.promises.readFile(
            path.join(repoAppFolder, 'metadata', 'description.md'),
            'utf8',
          );
          parsedConfig.data.repo = repo;
          if (repo !== 'runtipi-default') {
            parsedConfig.data.id = `${repo}-${parsedConfig.data.id}`;
          }
          return { ...parsedConfig.data, description };
        }
      }
    } catch (error) {
      this.logger.error(`Error getting app info from app store for ${id}: ${error}`);
    }
  }

  /**
   * Get the app info from the installed apps apps
   * @param id - The app id
   */
  public async getInstalledAppInfo(id: string) {
    try {
      const installedAppFolder = path.join(this.getInstalledAppsFolder(), sanitizePath(id));

      if (await pathExists(path.join(installedAppFolder, 'config.json'))) {
        const configFile = await fs.promises.readFile(
          path.join(installedAppFolder, 'config.json'),
          'utf8',
        );
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile));

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = await fs.promises.readFile(
            path.join(installedAppFolder, 'metadata', 'description.md'),
            'utf8',
          );
          return { ...parsedConfig.data, description };
        }
      }
    } catch (error) {
      this.logger.error(`Error getting installed app info for ${id}: ${error}`);
    }
  }

  /**
   *  This function returns an object containing information about the updates available for the app with the provided id.
   *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
   *  If the config.json file is invalid, it returns null.
   *  If the app is not found, it returns null.
   *
   *  @param {string} id - The app id.
   */
  public async getAppUpdateInfo(id: string, repo: string) {
    const config = await this.getAppInfoFromAppStore(id, repo);

    if (config) {
      return {
        latestVersion: config.tipi_version,
        minTipiVersion: config.min_tipi_version,
        latestDockerVersion: config.version,
      };
    }

    return { latestVersion: 0, latestDockerVersion: '0.0.0' };
  }

  public async getAvailableAppIds() {
    const repositories = await this.getRepositories();
    const allAppIds: Record<string, string[]> = {};
    for (const repoName of Object.keys(repositories)) {
      if (repoName) {
        if (repositories[repoName]) {
          const repoDir = await this.getAppsRepoFolder(getRepoHash(repositories[repoName]));
          const appsDir = await fs.promises.readdir(repoDir);
          const skippedFiles = [
            '__tests__',
            'docker-compose.common.yml',
            'schema.json',
            '.DS_Store',
          ];
          allAppIds[repoName] = appsDir.filter((app) => !skippedFiles.includes(app));
        }
      }
    }

    return allAppIds;
  }

  public async listBackupsByAppId(appId: string) {
    const backupsDir = path.join(this.dataDir, 'backups', sanitizePath(appId));

    if (!(await pathExists(backupsDir))) {
      return [];
    }

    try {
      const list = await fs.promises.readdir(backupsDir);

      const backups = await Promise.all(
        list.map(async (backup) => {
          const stats = await fs.promises.stat(path.join(backupsDir, backup));
          return { id: backup, size: stats.size, date: stats.mtime.toISOString() };
        }),
      );

      return backups;
    } catch (error) {
      this.logger.error(`Error listing backups for app ${appId}: ${error}`);
      return [];
    }
  }

  public async deleteBackup(appId: string, filename: string) {
    const backupPath = path.join(this.dataDir, 'backups', sanitizePath(appId), filename);

    if (await pathExists(backupPath)) {
      await fs.promises.unlink(backupPath);
    }
  }
}
