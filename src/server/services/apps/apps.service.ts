import validator from 'validator';
import { App, PrismaClient } from '@prisma/client';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAvailableApps, ensureAppFolder, AppInfo, getAppInfo, getUpdateInfo } from './apps.helpers';
import { getConfig } from '../../core/TipiConfig';
import { EventDispatcher } from '../../core/EventDispatcher';
import { Logger } from '../../core/Logger';
import { createFolder } from '../../common/fs.helpers';
import { notEmpty } from '../../common/typescript.helpers';

const sortApps = (a: AppInfo, b: AppInfo) => a.name.localeCompare(b.name);
const filterApp = (app: AppInfo): boolean => {
  if (!app.supported_architectures) {
    return true;
  }

  const arch = getConfig().architecture;
  return app.supported_architectures.includes(arch);
};

const filterApps = (apps: AppInfo[]): AppInfo[] => apps.sort(sortApps).filter(filterApp);

export class AppServiceClass {
  private prisma;

  constructor(p: PrismaClient) {
    this.prisma = p;
  }

  /**
   *  This function starts all apps that are in the 'running' status.
   *  It finds all the running apps and starts them by regenerating the env file, checking the env file and dispatching the start event.
   *  If the start event is successful, the app's status is updated to 'running', otherwise, it is updated to 'stopped'
   *  If there is an error while starting the app, it logs the error and updates the app's status to 'stopped'.
   *
   *  @returns {Promise<void>} - A promise that resolves when all apps are started.
   */
  public async startAllApps() {
    const apps = await this.prisma.app.findMany({ where: { status: 'running' }, orderBy: { id: 'asc' } });

    // Update all apps with status different than running or stopped to stopped
    await this.prisma.app.updateMany({ where: { status: { notIn: ['running', 'stopped', 'missing'] } }, data: { status: 'stopped' } });

    await Promise.all(
      apps.map(async (app) => {
        // Regenerate env file
        try {
          ensureAppFolder(app.id);
          generateEnvFile(app);
          checkEnvFile(app.id);

          await this.prisma.app.update({ where: { id: app.id }, data: { status: 'starting' } });

          EventDispatcher.dispatchEventAsync('app', ['start', app.id]).then(({ success }) => {
            if (success) {
              this.prisma.app.update({ where: { id: app.id }, data: { status: 'running' } }).then(() => {});
            } else {
              this.prisma.app.update({ where: { id: app.id }, data: { status: 'stopped' } }).then(() => {});
            }
          });
        } catch (e) {
          await this.prisma.app.update({ where: { id: app.id }, data: { status: 'stopped' } });
          Logger.error(e);
        }
      }),
    );
  }

  /**
   * This function starts an app specified by its appName, regenerates its environment file and checks for missing requirements.
   * It updates the app's status in the database to 'starting' and 'running' if the start process is successful, otherwise it updates the status to 'stopped'.
   *
   * @param {string} appName - The name of the app to start
   * @returns {Promise<App | null>} - Returns a promise that resolves with the updated app information.
   * @throws {Error} - If the app is not found or the start process fails.
   */
  public startApp = async (appName: string) => {
    let app = await this.prisma.app.findUnique({ where: { id: appName } });

    if (!app) {
      throw new Error(`App ${appName} not found`);
    }

    ensureAppFolder(appName);
    // Regenerate env file
    generateEnvFile(app);
    checkEnvFile(appName);

    await this.prisma.app.update({ where: { id: appName }, data: { status: 'starting' } });
    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['start', app.id]);

    if (success) {
      await this.prisma.app.update({ where: { id: appName }, data: { status: 'running' } });
    } else {
      await this.prisma.app.update({ where: { id: appName }, data: { status: 'stopped' } });
      throw new Error(`App ${appName} failed to start\nstdout: ${stdout}`);
    }

    app = await this.prisma.app.findUnique({ where: { id: appName } });

    return app;
  };

  /**
   * Installs an app and updates the status accordingly
   *
   * @param {string} id - The id of the app to be installed
   * @param {Record<string, string>} form - The form data submitted by the user
   * @param {boolean} [exposed] - A flag indicating if the app will be exposed to the internet
   * @param {string} [domain] - The domain name to expose the app to the internet, required if exposed is true
   * @returns {Promise<App | null>} Returns a promise that resolves to the installed app object
   */
  public installApp = async (id: string, form: Record<string, string>, exposed?: boolean, domain?: string) => {
    let app = await this.prisma.app.findUnique({ where: { id } });

    if (app) {
      await this.startApp(id);
    } else {
      if (exposed && !domain) {
        throw new Error('Domain is required if app is exposed');
      }

      if (domain && !validator.isFQDN(domain)) {
        throw new Error(`Domain ${domain} is not valid`);
      }

      ensureAppFolder(id, true);
      checkAppRequirements(id);

      // Create app folder
      createFolder(`/app/storage/app-data/${id}`);

      const appInfo = getAppInfo(id);

      if (!appInfo) {
        throw new Error(`App ${id} has invalid config.json file`);
      }

      if (!appInfo.exposable && exposed) {
        throw new Error(`App ${id} is not exposable`);
      }

      if (exposed) {
        const appsWithSameDomain = await this.prisma.app.findMany({ where: { domain, exposed: true } });
        if (appsWithSameDomain.length > 0) {
          throw new Error(`Domain ${domain} already in use by app ${appsWithSameDomain[0]?.id}`);
        }
      }

      app = await this.prisma.app.create({ data: { id, status: 'installing', config: form, version: appInfo.tipi_version, exposed: exposed || false, domain } });

      if (app) {
        // Create env file
        generateEnvFile(app);
      }

      // Run script
      const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['install', id]);

      if (!success) {
        await this.prisma.app.delete({ where: { id } });
        throw new Error(`App ${id} failed to install\nstdout: ${stdout}`);
      }
    }

    app = await this.prisma.app.update({ where: { id }, data: { status: 'running' } });

    return app;
  };

  /**
   * Lists available apps
   *
   * @returns {Promise<{apps: Array<AppInfo>, total: number }>} An object containing list of apps and total number of apps
   */
  public static listApps = async () => {
    const apps = await getAvailableApps();
    const filteredApps = filterApps(apps);

    return { apps: filteredApps, total: apps.length };
  };

  /**
   * Update the configuration of an app
   *
   * @param {string} id - The ID of the app to update.
   * @param {object} form - The new configuration of the app.
   * @param {boolean} [exposed=false] - If the app should be exposed or not.
   * @param {string} [domain] - The domain for the app if exposed is true.
   * @returns {Promise<App | null>} The updated app
   */
  public updateAppConfig = async (id: string, form: Record<string, string>, exposed?: boolean, domain?: string) => {
    if (exposed && !domain) {
      throw new Error('Domain is required if app is exposed');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new Error(`Domain ${domain} is not valid`);
    }

    let app = await this.prisma.app.findUnique({ where: { id } });

    if (!app) {
      throw new Error(`App ${id} not found`);
    }

    const appInfo = getAppInfo(app.id, app.status);

    if (!appInfo) {
      throw new Error(`App ${id} has invalid config.json`);
    }

    if (!appInfo.exposable && exposed) {
      throw new Error(`App ${id} is not exposable`);
    }

    if (exposed) {
      const appsWithSameDomain = await this.prisma.app.findMany({ where: { domain, exposed: true, id: { not: id } } });
      if (appsWithSameDomain.length > 0) {
        throw new Error(`Domain ${domain} already in use by app ${appsWithSameDomain[0]?.id}`);
      }
    }

    app = await this.prisma.app.update({ where: { id }, data: { config: form, exposed: exposed || false, domain } });

    generateEnvFile(app);

    return app;
  };

  /**
   * Stops a running application by its id
   *
   * @param {string} id - The id of the application to stop
   * @returns {Promise<App>} - The stopped application
   * @throws {Error} - If the app cannot be found or if stopping the app failed
   */
  public stopApp = async (id: string) => {
    let app = await this.prisma.app.findUnique({ where: { id } });

    if (!app) {
      throw new Error(`App ${id} not found`);
    }

    ensureAppFolder(id);
    generateEnvFile(app);

    // Run script
    await this.prisma.app.update({ where: { id }, data: { status: 'stopping' } });

    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['stop', id]);

    if (success) {
      await this.prisma.app.update({ where: { id }, data: { status: 'stopped' } });
    } else {
      await this.prisma.app.update({ where: { id }, data: { status: 'running' } });
      throw new Error(`App ${id} failed to stop\nstdout: ${stdout}`);
    }

    app = await this.prisma.app.findUnique({ where: { id } });

    return app;
  };

  /**
   * Uninstalls an app by stopping it, running the app's `uninstall` script, and removing its data
   *
   * @param {string} id - The id of the app to uninstall
   * @returns {Promise<{id: string, status: string, config: object}>} - An object containing the id of the uninstalled app, the status of the app ('missing'), and the config object
   * @throws {Error} - If the app is not found or if the app's `uninstall` script fails
   */
  public uninstallApp = async (id: string) => {
    const app = await this.prisma.app.findUnique({ where: { id } });

    if (!app) {
      throw new Error(`App ${id} not found`);
    }
    if (app.status === 'running') {
      await this.stopApp(id);
    }

    ensureAppFolder(id);
    generateEnvFile(app);

    await this.prisma.app.update({ where: { id }, data: { status: 'uninstalling' } });

    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['uninstall', id]);

    if (!success) {
      await this.prisma.app.update({ where: { id }, data: { status: 'stopped' } });
      throw new Error(`App ${id} failed to uninstall\nstdout: ${stdout}`);
    }

    await this.prisma.app.delete({ where: { id } });

    return { id, status: 'missing', config: {} };
  };

  /**
   * Returns the app with the provided id. If the app is not found, it returns a default app object
   *
   * @param {string} id - The id of the app to retrieve
   * @returns {Promise<App>} - The app object
   */
  public getApp = async (id: string) => {
    let app = await this.prisma.app.findUnique({ where: { id } });
    const info = getAppInfo(id, app?.status);
    const updateInfo = getUpdateInfo(id);

    if (info) {
      if (!app) {
        app = { id, status: 'missing', config: {}, exposed: false, domain: '' } as App;
      }

      return { ...app, ...updateInfo, info };
    }

    throw new Error(`App ${id} has invalid config.json`);
  };

  /**
   * Updates an app with the specified ID
   *
   * @param {string} id - ID of the app to update
   * @returns {Promise<App>} - An object representing the updated app
   * @throws {Error} - If the app is not found or if the update process fails.
   */
  public updateApp = async (id: string) => {
    let app = await this.prisma.app.findUnique({ where: { id } });

    if (!app) {
      throw new Error(`App ${id} not found`);
    }

    ensureAppFolder(id);
    generateEnvFile(app);

    await this.prisma.app.update({ where: { id }, data: { status: 'updating' } });

    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['update', id]);

    if (success) {
      const appInfo = getAppInfo(app.id, app.status);

      await this.prisma.app.update({ where: { id }, data: { status: 'running', version: appInfo?.tipi_version } });
    } else {
      await this.prisma.app.update({ where: { id }, data: { status: 'stopped' } });
      throw new Error(`App ${id} failed to update\nstdout: ${stdout}`);
    }

    app = await this.prisma.app.update({ where: { id }, data: { status: 'stopped' } });
    return app;
  };

  /**
   * Returns a list of all installed apps
   *
   * @returns {Promise<App[]>} - An array of app objects
   */
  public installedApps = async () => {
    const apps = await this.prisma.app.findMany({ orderBy: { id: 'asc' } });

    return apps
      .map((app) => {
        const info = getAppInfo(app.id, app.status);
        const updateInfo = getUpdateInfo(app.id);
        if (info) {
          return { ...app, ...updateInfo, info };
        }
        return null;
      })
      .filter(notEmpty);
  };
}
