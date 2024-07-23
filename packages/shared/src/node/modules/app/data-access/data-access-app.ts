import fs from 'fs-extra';
import path from 'path';
import { FileLogger } from '../../../logger/FileLogger';
import { sanitizePath } from '../../../../helpers/sanitizers';
import { pathExists } from '../../../helpers/fs-helpers';
import { appInfoSchema } from '../../../../schemas/app-schemas';

// Lower level data access class for apps
export class DataAccessApp {
  private dataDir: string;
  private appDataDir: string;
  private appsRepoId: string;
  private logger: FileLogger;

  constructor(params: { dataDir: string; appDataDir: string; appsRepoId: string }) {
    this.dataDir = params.dataDir;
    this.appDataDir = params.appDataDir;
    this.appsRepoId = params.appsRepoId;
    this.logger = new FileLogger('data-access-app', path.join(params.dataDir, 'logs'), true);
  }

  private getInstalledAppsFolder() {
    return path.join(this.dataDir, 'apps');
  }

  private getAppsRepoFolder() {
    return path.join(this.dataDir, 'repos', sanitizePath(this.appsRepoId), 'apps');
  }

  /**
   * Get the app info from the app store
   * @param id - The app id
   */
  public async getAppInfoFromAppStore(id: string) {
    try {
      const repoAppFolder = path.join(this.getAppsRepoFolder(), sanitizePath(id));

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
  public async getAppUpdateInfo(id: string) {
    const config = await this.getAppInfoFromAppStore(id);

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
    const appsRepoFolder = this.getAppsRepoFolder();

    if (!(await pathExists(appsRepoFolder))) {
      this.logger.error(
        `Apps repo ${this.appsRepoId} not found. Make sure your repo is configured correctly.`,
      );
      return [];
    }

    const appsDir = await fs.promises.readdir(appsRepoFolder);
    const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json', '.DS_Store'];

    return appsDir.filter((app) => !skippedFiles.includes(app));
  }

  public async listBackupsByAppId(appId: string) {
    const backupsDir = path.join(this.dataDir, 'backups', sanitizePath(appId));

    if (!(await pathExists(backupsDir))) {
      return [];
    }

    const list = await fs.promises.readdir(backupsDir);

    const backups = await Promise.all(
      list.map(async (backup) => {
        const stats = await fs.promises.stat(path.join(backupsDir, backup));
        return { id: backup, size: stats.size, date: stats.mtime.toISOString() };
      }),
    );

    return backups;
  }
}
