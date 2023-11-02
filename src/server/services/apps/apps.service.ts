import validator from 'validator';
import { App } from '@/server/db/schema';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import { Database } from '@/server/db';
import { AppInfo } from '@runtipi/shared';
import { EventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { checkAppRequirements, getAvailableApps, getAppInfo, getUpdateInfo } from './apps.helpers';
import { getConfig } from '../../core/TipiConfig';
import { Logger } from '../../core/Logger';
import { notEmpty } from '../../common/typescript.helpers';

type AlwaysFields = {
  isVisibleOnGuestDashboard?: boolean;
  domain?: string;
  exposed?: boolean;
};

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

    const eventDispatcher = new EventDispatcher('startAllApps');

    await Promise.all(
      apps.map(async (app) => {
        try {
          await this.queries.updateApp(app.id, { status: 'starting' });

          eventDispatcher.dispatchEventAsync({ type: 'app', command: 'start', appid: app.id, form: castAppConfig(app.config) }).then(({ success }) => {
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

    await eventDispatcher.close();
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

    await this.queries.updateApp(appName, { status: 'starting' });
    const eventDispatcher = new EventDispatcher('startApp');
    const { success, stdout } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'start', appid: appName, form: castAppConfig(app.config) });
    await eventDispatcher.close();

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
   */
  public installApp = async (id: string, form: Record<string, unknown> & AlwaysFields) => {
    const app = await this.queries.getApp(id);

    const { exposed, domain, isVisibleOnGuestDashboard } = form;

    if (app) {
      await this.startApp(id);
    } else {
      const apps = await this.queries.getApps();

      if (apps.length >= 6 && getConfig().demoMode) {
        throw new TranslatedError('server-messages.errors.demo-mode-limit');
      }

      if (exposed && !domain) {
        throw new TranslatedError('server-messages.errors.domain-required-if-expose-app');
      }

      if (domain && !validator.isFQDN(domain)) {
        throw new TranslatedError('server-messages.errors.domain-not-valid', { domain });
      }

      checkAppRequirements(id);

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

      await this.queries.createApp({
        id,
        status: 'installing',
        config: form,
        version: appInfo.tipi_version,
        exposed: exposed || false,
        domain: domain || null,
        isVisibleOnGuestDashboard,
      });

      // Run script
      const eventDispatcher = new EventDispatcher('installApp');
      const { success, stdout } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'install', appid: id, form });
      await eventDispatcher.close();

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
   */
  public updateAppConfig = async (id: string, form: Record<string, unknown> & AlwaysFields) => {
    const { exposed, domain } = form;

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

    const eventDispatcher = new EventDispatcher('updateAppConfig');
    const { success } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'generate_env', appid: id, form });
    await eventDispatcher.close();

    if (success) {
      const updatedApp = await this.queries.updateApp(id, { exposed: exposed || false, domain: domain || null, config: form, isVisibleOnGuestDashboard: form.isVisibleOnGuestDashboard });
      return updatedApp;
    }

    throw new TranslatedError('server-messages.errors.app-failed-to-update', { id });
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

    // Run script
    await this.queries.updateApp(id, { status: 'stopping' });

    const eventDispatcher = new EventDispatcher('stopApp');
    const { success, stdout } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'stop', appid: id, form: castAppConfig(app.config) });
    await eventDispatcher.close();

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

    await this.queries.updateApp(id, { status: 'uninstalling' });

    const eventDispatcher = new EventDispatcher('uninstallApp');
    const { success, stdout } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'uninstall', appid: id, form: castAppConfig(app.config) });
    await eventDispatcher.close();

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

    await this.queries.updateApp(id, { status: 'updating' });

    const eventDispatcher = new EventDispatcher('updateApp');
    const { success, stdout } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'update', appid: id, form: castAppConfig(app.config) });
    await eventDispatcher.close();

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

  public getGuestDashboardApps = async () => {
    const apps = await this.queries.getGuestDashboardApps();

    console.log(apps);
    return apps
      .map((app) => {
        const info = getAppInfo(app.id, app.status);
        if (info) {
          return { ...app, info };
        }
        return null;
      })
      .filter(notEmpty);
  };
}

export type AppService = InstanceType<typeof AppServiceClass>;
