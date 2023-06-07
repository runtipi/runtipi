import validator from 'validator';
import { App } from '@/server/db/schema';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import { Database } from '@/server/db';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAvailableApps, ensureAppFolder, AppInfo, getAppInfo, getUpdateInfo } from './apps.helpers';
import { getConfig } from '../../core/TipiConfig';
import { EventDispatcher } from '../../core/EventDispatcher';
import { Logger } from '../../core/Logger';
import { createFolder } from '../../common/fs.helpers';
import { notEmpty } from '../../common/typescript.helpers';

const sortApps = (a: AppInfo, b: AppInfo) => a.id.localeCompare(b.id);
const filterApp = (app: AppInfo): boolean => {
  if (!app.supported_architectures) {
    return true;
  }

  const arch = getConfig().architecture;
  return app.supported_architectures.includes(arch);
};

const filterApps = (apps: AppInfo[]): AppInfo[] => apps.sort(sortApps).filter(filterApp);

export class AppServiceClass {
  private queries;

  constructor(p: Database) {
    this.queries = new AppQueries(p);
  }

  /**
   *  This function starts all apps that are in the 'running' status.
   *  It finds all the running apps and starts them by regenerating the env file, checking the env file and dispatching the start event.
   *  If the start event is successful, the app's status is updated to 'running', otherwise, it is updated to 'stopped'
   *  If there is an error while starting the app, it logs the error and updates the app's status to 'stopped'.
   */
  public async startAllApps() {
    const apps = await this.queries.getAppsByStatus('running');

    // Update all apps with status different than running or stopped to stopped
    await this.queries.updateAppsByStatusNotIn(['running', 'stopped', 'missing'], { status: 'stopped' });

    await Promise.all(
      apps.map(async (app) => {
        // Regenerate env file
        try {
          ensureAppFolder(app.id);
          generateEnvFile(app);
          checkEnvFile(app.id);

          await this.queries.updateApp(app.id, { status: 'starting' });

          EventDispatcher.dispatchEventAsync('app', ['start', app.id]).then(({ success }) => {
            if (success) {
              this.queries.updateApp(app.id, { status: 'running' });
            } else {
              this.queries.updateApp(app.id, { status: 'stopped' });
            }
          });
        } catch (e) {
          await this.queries.updateApp(app.id, { status: 'stopped' });
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
   * @throws {Error} - If the app is not found or the start process fails.
   */
  public startApp = async (appName: string) => {
    const app = await this.queries.getApp(appName);
    if (!app) {
      throw new TranslatedError('server-messages.errors.app-not-found', { id: appName });
    }

    ensureAppFolder(appName);
    // Regenerate env file
    generateEnvFile(app);
    checkEnvFile(appName);

    await this.queries.updateApp(appName, { status: 'starting' });
    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['start', app.id]);

    if (success) {
      await this.queries.updateApp(appName, { status: 'running' });
    } else {
      await this.queries.updateApp(appName, { status: 'stopped' });
      Logger.error(`Failed to start app ${appName}: ${stdout}`);
      throw new TranslatedError('server-messages.errors.app-failed-to-start', { id: appName });
    }

    const updatedApp = await this.queries.getApp(appName);
    return updatedApp;
  };

  /**
   * Installs an app and updates the status accordingly
   *
   * @param {string} id - The id of the app to be installed
   * @param {Record<string, string>} form - The form data submitted by the user
   * @param {boolean} [exposed] - A flag indicating if the app will be exposed to the internet
   * @param {string} [domain] - The domain name to expose the app to the internet, required if exposed is true
   */
  public installApp = async (id: string, form: Record<string, string>, exposed?: boolean, domain?: string) => {
    const app = await this.queries.getApp(id);

    if (app) {
      await this.startApp(id);
    } else {
      if (exposed && !domain) {
        throw new TranslatedError('server-messages.errors.domain-required-if-expose-app');
      }

      if (domain && !validator.isFQDN(domain)) {
        throw new TranslatedError('server-messages.errors.domain-not-valid', { domain });
      }

      ensureAppFolder(id, true);
      checkAppRequirements(id);

      // Create app folder
      createFolder(`/app/storage/app-data/${id}`);

      const appInfo = getAppInfo(id);

      if (!appInfo) {
        throw new TranslatedError('server-messages.errors.invalid-config', { id });
      }

      if (!appInfo.exposable && exposed) {
        throw new TranslatedError('server-messages.errors.app-not-exposable', { id });
      }

      if ((appInfo.force_expose && !exposed) || (appInfo.force_expose && !domain)) {
        throw new TranslatedError('server-messages.errors.app-force-exposed', { id });
      }

      if (exposed && domain) {
        const appsWithSameDomain = await this.queries.getAppsByDomain(domain, id);

        if (appsWithSameDomain.length > 0) {
          throw new TranslatedError('server-messages.errors.domain-already-in-use', { domain, id: appsWithSameDomain[0]?.id });
        }
      }

      const newApp = await this.queries.createApp({ id, status: 'installing', config: form, version: appInfo.tipi_version, exposed: exposed || false, domain: domain || null });

      if (newApp) {
        // Create env file
        generateEnvFile(newApp);
      }

      // Run script
      const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['install', id]);

      if (!success) {
        await this.queries.deleteApp(id);
        Logger.error(`Failed to install app ${id}: ${stdout}`);
        throw new TranslatedError('server-messages.errors.app-failed-to-install', { id });
      }
    }

    const updatedApp = await this.queries.updateApp(id, { status: 'running' });
    return updatedApp;
  };

  /**
   * Lists available apps
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
   * @param {boolean} [exposed] - If the app should be exposed or not.
   * @param {string} [domain] - The domain for the app if exposed is true.
   */
  public updateAppConfig = async (id: string, form: Record<string, string>, exposed?: boolean, domain?: string) => {
    if (exposed && !domain) {
      throw new TranslatedError('server-messages.errors.domain-required-if-expose-app');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatedError('server-messages.errors.domain-not-valid');
    }

    const app = await this.queries.getApp(id);

    if (!app) {
      throw new TranslatedError('server-messages.errors.app-not-found', { id });
    }

    const appInfo = getAppInfo(app.id, app.status);

    if (!appInfo) {
      throw new TranslatedError('server-messages.errors.invalid-config', { id });
    }

    if (!appInfo.exposable && exposed) {
      throw new TranslatedError('server-messages.errors.app-not-exposable', { id });
    }

    if ((appInfo.force_expose && !exposed) || (appInfo.force_expose && !domain)) {
      throw new TranslatedError('server-messages.errors.app-force-exposed', { id });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.queries.getAppsByDomain(domain, id);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatedError('server-messages.errors.domain-already-in-use', { domain, id: appsWithSameDomain[0]?.id });
      }
    }

    const updatedApp = await this.queries.updateApp(id, { exposed: exposed || false, domain: domain || null, config: form });

    if (updatedApp) {
      generateEnvFile(updatedApp);
    }

    return updatedApp;
  };

  /**
   * Stops a running application by its id
   *
   * @param {string} id - The id of the application to stop
   * @throws {Error} - If the app cannot be found or if stopping the app failed
   */
  public stopApp = async (id: string) => {
    const app = await this.queries.getApp(id);

    if (!app) {
      throw new TranslatedError('server-messages.errors.app-not-found', { id });
    }

    ensureAppFolder(id);
    generateEnvFile(app);

    // Run script
    await this.queries.updateApp(id, { status: 'stopping' });

    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['stop', id]);

    if (success) {
      await this.queries.updateApp(id, { status: 'stopped' });
    } else {
      await this.queries.updateApp(id, { status: 'running' });
      Logger.error(`Failed to stop app ${id}: ${stdout}`);
      throw new TranslatedError('server-messages.errors.app-failed-to-stop', { id });
    }

    const updatedApp = await this.queries.getApp(id);
    return updatedApp;
  };

  /**
   * Uninstalls an app by stopping it, running the app's `uninstall` script, and removing its data
   *
   * @param {string} id - The id of the app to uninstall
   * @throws {Error} - If the app is not found or if the app's `uninstall` script fails
   */
  public uninstallApp = async (id: string) => {
    const app = await this.queries.getApp(id);

    if (!app) {
      throw new TranslatedError('server-messages.errors.app-not-found', { id });
    }
    if (app.status === 'running') {
      await this.stopApp(id);
    }

    ensureAppFolder(id);
    generateEnvFile(app);

    await this.queries.updateApp(id, { status: 'uninstalling' });

    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['uninstall', id]);

    if (!success) {
      await this.queries.updateApp(id, { status: 'stopped' });
      Logger.error(`Failed to uninstall app ${id}: ${stdout}`);
      throw new TranslatedError('server-messages.errors.app-failed-to-uninstall', { id });
    }

    await this.queries.deleteApp(id);

    return { id, status: 'missing', config: {} };
  };

  /**
   * Returns the app with the provided id. If the app is not found, it returns a default app object
   *
   * @param {string} id - The id of the app to retrieve
   */
  public getApp = async (id: string) => {
    let app = await this.queries.getApp(id);
    const info = getAppInfo(id, app?.status);
    const updateInfo = getUpdateInfo(id);

    if (info) {
      if (!app) {
        app = { id, status: 'missing', config: {}, exposed: false, domain: '' } as App;
      }

      return { ...app, ...updateInfo, info };
    }

    throw new TranslatedError('server-messages.errors.invalid-config', { id });
  };

  /**
   * Updates an app with the specified ID
   *
   * @param {string} id - ID of the app to update
   * @throws {Error} - If the app is not found or if the update process fails.
   */
  public updateApp = async (id: string) => {
    const app = await this.queries.getApp(id);

    if (!app) {
      throw new TranslatedError('server-messages.errors.app-not-found', { id });
    }

    ensureAppFolder(id);
    generateEnvFile(app);

    await this.queries.updateApp(id, { status: 'updating' });

    const { success, stdout } = await EventDispatcher.dispatchEventAsync('app', ['update', id]);

    if (success) {
      const appInfo = getAppInfo(app.id, app.status);

      await this.queries.updateApp(id, { status: 'running', version: appInfo?.tipi_version });
    } else {
      await this.queries.updateApp(id, { status: 'stopped' });
      Logger.error(`Failed to update app ${id}: ${stdout}`);
      throw new TranslatedError('server-messages.errors.app-failed-to-update', { id });
    }

    const updatedApp = await this.queries.updateApp(id, { status: 'stopped' });
    return updatedApp;
  };

  /**
   * Returns a list of all installed apps
   */
  public installedApps = async () => {
    const apps = await this.queries.getApps();

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
