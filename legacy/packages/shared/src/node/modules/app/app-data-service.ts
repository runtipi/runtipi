import type { ILogger } from '../../logger/Logger.interface';
import { pLimit } from '../../../helpers/utils';
import { notEmpty } from '../../helpers/typescript-helpers';
import { AppFileAccessor } from './app-file-accessor';

export interface IAppDataService {
  getAppInfoFromInstalledOrAppStore: AppDataService['getAppInfoFromInstalledOrAppStore'];
  getAllAvailableApps: AppDataService['getAllAvailableApps'];
}

export class AppDataService implements IAppDataService {
  private dataAccessApp: AppFileAccessor;

  constructor(params: { dataDir: string; appDataDir: string; appsRepoId: string; logger: ILogger }) {
    const { dataDir, appDataDir, appsRepoId, logger } = params;
    this.dataAccessApp = new AppFileAccessor({ dataDir, appDataDir, appsRepoId, logger });
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

  public async getAllAvailableApps() {
    const appIds = await this.dataAccessApp.getAvailableAppIds();

    const limit = pLimit(10);
    const apps = await Promise.all(
      appIds.map(async (app) => {
        return limit(() => this.dataAccessApp.getAppInfoFromAppStore(app));
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
}
