import { notEmpty } from '../../../helpers/typescript-helpers';
import { DataAccessApp } from '../data-access/data-access-app';

export interface IAppDataService {
  getAppInfoFromInstalledOrAppStore: AppDataService['getAppInfoFromInstalledOrAppStore'];
  getInstalledInfo: AppDataService['getInstalledInfo'];
  getInfoFromAppStore: AppDataService['getInfoFromAppStore'];
  getUpdateInfo: AppDataService['getUpdateInfo'];
  getAllAvailableApps: AppDataService['getAllAvailableApps'];
  getAppBackups: AppDataService['getAppBackups'];
  deleteAppBackup: AppDataService['deleteAppBackup'];
}

export class AppDataService implements IAppDataService {
  private dataAccessApp: DataAccessApp;

  constructor(params: { dataDir: string; appDataDir: string; appsRepoId: string }) {
    const { dataDir, appDataDir, appsRepoId } = params;
    this.dataAccessApp = new DataAccessApp({ dataDir, appDataDir, appsRepoId });
  }

  /**
   *  This function reads the config.json and metadata/description.md files for the app with the provided id,
   *  parses the config file and returns an object with app information.
   *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
   *  If the config.json file is invalid, it returns null.
   *  If an error occurs during the process, it logs the error message and throws an error.
   *
   *  @param {string} id - The app id.
   */
  public async getAppInfoFromInstalledOrAppStore(id: string) {
    const info = await this.dataAccessApp.getInstalledAppInfo(id);
    if (!info) {
      return this.dataAccessApp.getAppInfoFromAppStore(id);
    }
    return info;
  }

  public getInstalledInfo(id: string) {
    return this.dataAccessApp.getInstalledAppInfo(id);
  }

  public getInfoFromAppStore(id: string) {
    return this.dataAccessApp.getAppInfoFromAppStore(id);
  }

  public async getUpdateInfo(id: string) {
    return this.dataAccessApp.getAppUpdateInfo(id);
  }

  public async getAllAvailableApps() {
    const appIds = await this.dataAccessApp.getAvailableAppIds();

    const apps = await Promise.all(
      appIds.map(async (app) => {
        return this.dataAccessApp.getAppInfoFromAppStore(app);
      }),
    );

    return apps.filter(notEmpty).map(({ id, categories, name, short_desc, deprecated, supported_architectures, created_at }) => ({
      id,
      categories,
      name,
      short_desc,
      deprecated,
      supported_architectures,
      created_at,
    }));
  }

  public async getAppBackups(params: { appId: string; pageSize: number; page: number }) {
    const { appId, page, pageSize } = params;
    const backups = await this.dataAccessApp.listBackupsByAppId(appId);
    backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = backups.slice(start, end);

    return {
      data,
      total: backups.length,
      currentPage: Math.floor(start / pageSize) + 1,
      lastPage: Math.ceil(backups.length / pageSize),
    };
  }

  public async deleteAppBackup(appId: string, filename: string) {
    return this.dataAccessApp.deleteBackup(appId, filename);
  }
}
