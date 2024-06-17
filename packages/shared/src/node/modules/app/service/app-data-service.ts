import { notEmpty } from '../../../helpers/typescript-helpers';
import { DataAccessApp } from '../data-access/data-access-app';

export class AppDataService {
  private dataAccessApp: DataAccessApp;

  constructor(dataDir: string, appsRepoId: string) {
    this.dataAccessApp = new DataAccessApp(dataDir, appsRepoId);
  }

  /**
   *  This function reads the config.json and metadata/description.md files for the app with the provided id,
   *  parses the config file and returns an object with app information.
   *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
   *  If the config.json file is invalid, it returns null.
   *  If an error occurs during the process, it logs the error message and throws an error.
   *
   *  @param {string} id - The app id.
   *  @param {App['status']} [status] - The app status.
   */
  public async getAppInfoFromInstalledOrAppStore(id: string, status?: string) {
    const installed = typeof status !== 'undefined' && status !== 'missing';

    if (installed) {
      return this.dataAccessApp.getInstalledAppInfo(id);
    } else {
      return this.dataAccessApp.getAppInfoFromAppStore(id);
    }
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

    return apps
      .filter(notEmpty)
      .map(({ id, categories, name, short_desc, deprecated, supported_architectures }) => ({
        id,
        categories,
        name,
        short_desc,
        deprecated,
        supported_architectures,
      }));
  }
}
