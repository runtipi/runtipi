import validator from 'validator';
import MiniSearch from 'minisearch';
import { App } from '@/server/db/schema';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import { Database, db } from '@/server/db';
import { AppInfo } from '@runtipi/shared';
import { EventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { castAppConfig } from '@/lib/helpers/castAppConfig';
import { checkAppRequirements, getAvailableApps as slow_getAvailableApps, getAppInfo, getUpdateInfo } from './apps.helpers';
import { TipiConfig } from '../../core/TipiConfig';
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

  const arch = TipiConfig.getConfig().architecture;
  return app.supported_architectures.includes(arch);
};

const filterApps = (apps: AppInfo[]): AppInfo[] => apps.sort(sortApps).filter(filterApp);

export class AppServiceClass {
  private queries;

  private appsAvailable: AppInfo[] | null = null;

  private miniSearch: MiniSearch<AppInfo> | null = null;

  private cacheTimeout = 1000 * 60 * 15; // 15 minutes

  private cacheLastUpdated = 0;

  constructor(p: Database = db) {
    this.queries = new AppQueries(p);
  }

  private invalidateCache() {
    this.appsAvailable = null;
    if (this.miniSearch) {
      this.miniSearch.removeAll();
    }
  }

  private async getAvailableApps() {
    // Invalidate cache if it's older than 15 minutes
    if (this.cacheLastUpdated && Date.now() - this.cacheLastUpdated > this.cacheTimeout) {
      this.invalidateCache();
    }

    if (!this.appsAvailable) {
      Logger.debug('apps service -> getAvailableApps');
      const apps = await slow_getAvailableApps();
      this.appsAvailable = filterApps(apps);

      this.miniSearch = new MiniSearch<(typeof this.appsAvailable)[number]>({
        fields: ['name', 'description', 'categories'],
        storeFields: ['id'],
        idField: 'id',
        searchOptions: {
          boost: { name: 2 },
          fuzzy: 0.2,
          prefix: true,
        },
      });
      this.miniSearch.addAll(this.appsAvailable);

      this.cacheLastUpdated = Date.now();
    }

    return this.appsAvailable;
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

          eventDispatcher
            .dispatchEventAsync({ type: 'app', command: 'start', appid: app.id, form: castAppConfig(app.config) })
            .then(({ success }) => {
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
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appName });
    }

    await this.queries.updateApp(appName, { status: 'starting' });
    const eventDispatcher = new EventDispatcher('startApp');
    eventDispatcher
      .dispatchEventAsync({
        type: 'app',
        command: 'start',
        appid: appName,
        form: castAppConfig(app.config),
      })
      .then(({ success, stdout }) => {
        if (success) {
          this.queries.updateApp(appName, { status: 'running' });
        } else {
          this.queries.updateApp(appName, { status: 'stopped' });
          Logger.error(`Failed to start app ${appName}: ${stdout}`);
        }

        eventDispatcher.close();
      });

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

      if (apps.length >= 6 && TipiConfig.getConfig().demoMode) {
        throw new TranslatedError('SYSTEM_ERROR_DEMO_MODE_LIMIT');
      }

      if (exposed && !domain) {
        throw new TranslatedError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
      }

      if (domain && !validator.isFQDN(domain)) {
        throw new TranslatedError('APP_ERROR_DOMAIN_NOT_VALID', { domain });
      }

      await checkAppRequirements(id);

      const appInfo = await getAppInfo(id);

      if (!appInfo) {
        throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id });
      }

      if (!appInfo.exposable && exposed) {
        throw new TranslatedError('APP_ERROR_APP_NOT_EXPOSABLE', { id });
      }

      if ((appInfo.force_expose && !exposed) || (appInfo.force_expose && !domain)) {
        throw new TranslatedError('APP_ERROR_APP_FORCE_EXPOSED', { id });
      }

      if (exposed && domain) {
        const appsWithSameDomain = await this.queries.getAppsByDomain(domain, id);

        if (appsWithSameDomain.length > 0) {
          throw new TranslatedError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
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
      eventDispatcher.dispatchEventAsync({ type: 'app', command: 'install', appid: id, form }).then(({ success, stdout }) => {
        if (success) {
          this.queries.updateApp(id, { status: 'running' });
        } else {
          this.queries.deleteApp(id);
          Logger.error(`Failed to install app ${id}: ${stdout}`);
        }

        eventDispatcher.close();
      });
    }
  };

  /**
   * Lists available apps
   */
  public listApps = async () => {
    const apps = await this.getAvailableApps();

    return { apps, total: apps.length };
  };

  public searchApps = async (params: { search?: string | null; category?: string | null; pageSize: number; cursor?: string | null }) => {
    const { search, category, pageSize, cursor } = params;

    let filteredApps = await this.getAvailableApps();

    if (category) {
      filteredApps = filteredApps.filter((app) => app.categories.some((c) => c === category));
    }

    if (search && this.miniSearch) {
      // Search for apps
      const result = this.miniSearch.search(search);

      const searchIds = result.map((app) => app.id);

      // Filter apps by search results and keep the order
      filteredApps = filteredApps.filter((app) => searchIds.includes(app.id)).sort((a, b) => searchIds.indexOf(a.id) - searchIds.indexOf(b.id));
    }

    const start = cursor ? filteredApps.findIndex((app) => app.id === cursor) : 0;

    const end = start + pageSize;
    const data = filteredApps.slice(start, end);

    return { data, total: filteredApps.length, nextCursor: filteredApps[end]?.id };
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
      throw new TranslatedError('APP_ERROR_DOMAIN_REQUIRED_IF_EXPOSE_APP');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new TranslatedError('APP_ERROR_DOMAIN_NOT_VALID');
    }

    const app = await this.queries.getApp(id);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id });
    }

    const appInfo = await getAppInfo(app.id, app.status);

    if (!appInfo) {
      throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id });
    }

    if (!appInfo.exposable && exposed) {
      throw new TranslatedError('APP_ERROR_APP_NOT_EXPOSABLE', { id });
    }

    if ((appInfo.force_expose && !exposed) || (appInfo.force_expose && !domain)) {
      throw new TranslatedError('APP_ERROR_APP_FORCE_EXPOSED', { id });
    }

    if (exposed && domain) {
      const appsWithSameDomain = await this.queries.getAppsByDomain(domain, id);

      if (appsWithSameDomain.length > 0) {
        throw new TranslatedError('APP_ERROR_DOMAIN_ALREADY_IN_USE', { domain, id: appsWithSameDomain[0]?.id });
      }
    }

    const eventDispatcher = new EventDispatcher('updateAppConfig');
    const { success } = await eventDispatcher.dispatchEventAsync({ type: 'app', command: 'generate_env', appid: id, form });
    await eventDispatcher.close();

    if (success) {
      const updatedApp = await this.queries.updateApp(id, {
        exposed: exposed || false,
        domain: domain || null,
        config: form,
        isVisibleOnGuestDashboard: form.isVisibleOnGuestDashboard,
      });
      return updatedApp;
    }

    throw new TranslatedError('APP_ERROR_APP_FAILED_TO_UPDATE', { id });
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
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id });
    }

    // Run script
    await this.queries.updateApp(id, { status: 'stopping' });

    const eventDispatcher = new EventDispatcher('stopApp');
    eventDispatcher.dispatchEventAsync({ type: 'app', command: 'stop', appid: id, form: castAppConfig(app.config) }).then(({ success, stdout }) => {
      if (success) {
        this.queries.updateApp(id, { status: 'stopped' });
      } else {
        Logger.error(`Failed to stop app ${id}: ${stdout}`);
        this.queries.updateApp(id, { status: 'running' });
      }

      eventDispatcher.close();
    });

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
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id });
    }
    if (app.status === 'running') {
      await this.stopApp(id);
    }

    await this.queries.updateApp(id, { status: 'uninstalling' });

    const eventDispatcher = new EventDispatcher('uninstallApp');
    eventDispatcher
      .dispatchEventAsync({ type: 'app', command: 'uninstall', appid: id, form: castAppConfig(app.config) })
      .then(({ stdout, success }) => {
        if (success) {
          this.queries.deleteApp(id);
        } else {
          this.queries.updateApp(id, { status: 'stopped' });
          Logger.error(`Failed to uninstall app ${id}: ${stdout}`);
        }
        eventDispatcher.close();
      });

    return { id, status: 'missing', config: {} };
  };

  /**
   * Reset App with the specified ID
   *
   * @param {string} id - ID of the app to reset
   * @throws {Error} - If the app is not found or if the update process fails.
   */
  public resetApp = async (id: string) => {
    const app = await this.getApp(id);

    this.queries.updateApp(id, { status: 'resetting' });

    const eventDispatcher = new EventDispatcher('resetApp');
    eventDispatcher.dispatchEventAsync({ type: 'app', command: 'reset', appid: id, form: castAppConfig(app.config) }).then(({ stdout, success }) => {
      if (success) {
        this.queries.updateApp(id, { status: 'running' });
      } else {
        this.queries.updateApp(id, { status: 'stopped' });
        Logger.error(`Failed to reset app ${id}: ${stdout}`);
      }
      eventDispatcher.close();
    });
  };

  /**
   * Returns the app with the provided id. If the app is not found, it returns a default app object
   *
   * @param {string} id - The id of the app to retrieve
   */
  public getApp = async (id: string) => {
    let app = await this.queries.getApp(id);
    const info = await getAppInfo(id, app?.status);
    const updateInfo = await getUpdateInfo(id);

    if (info) {
      if (!app) {
        app = { id, status: 'missing', config: {}, exposed: false, domain: '' } as App;
      }

      return { ...app, ...updateInfo, info };
    }

    throw new TranslatedError('APP_ERROR_INVALID_CONFIG', { id });
  };

  /**
   * Updates an app with the specified ID
   *
   * @param {string} id - ID of the app to update
   * @throws {Error} - If the app is not found or if the update process fails.
   */
  public updateApp = async (id: string) => {
    const app = await this.queries.getApp(id);
    const appStatusBeforeUpdate = app?.status;

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id });
    }

    await this.queries.updateApp(id, { status: 'updating' });

    const eventDispatcher = new EventDispatcher('updateApp');
    eventDispatcher
      .dispatchEventAsync({
        type: 'app',
        command: 'update',
        appid: id,
        form: castAppConfig(app.config),
      })
      .then(async ({ success, stdout }) => {
        if (success) {
          const appInfo = await getAppInfo(app.id, app.status);

          this.queries.updateApp(id, { version: appInfo?.tipi_version });
          if (appStatusBeforeUpdate === 'running') {
            this.startApp(id);
          } else {
            this.queries.updateApp(id, { status: appStatusBeforeUpdate });
          }
        } else {
          this.queries.updateApp(id, { status: 'stopped' });
          Logger.error(`Failed to update app ${id}: ${stdout}`);
        }

        eventDispatcher.close();
      });

    const updatedApp = await this.getApp(id);
    return updatedApp;
  };

  /**
   * Returns a list of all installed apps
   */
  public installedApps = async () => {
    const apps = await this.queries.getApps();

    return Promise.all(
      apps.map(async (app) => {
        const info = await getAppInfo(app.id, app.status);
        const updateInfo = await getUpdateInfo(app.id);
        if (info) {
          return { ...app, ...updateInfo, info };
        }
        return null;
      }),
    ).then((r) => r.filter(notEmpty));
  };

  public getGuestDashboardApps = async () => {
    const apps = await this.queries.getGuestDashboardApps();

    return Promise.all(
      apps.map(async (app) => {
        const info = await getAppInfo(app.id, app.status);
        if (info) {
          return { ...app, info };
        }
        return null;
      }),
    ).then((r) => r.filter(notEmpty));
  };
}

export type AppService = InstanceType<typeof AppServiceClass>;

declare global {
  // eslint-disable-next-line vars-on-top, no-var -- globalThis is not a module
  var AppService: AppService;
}

const appServiceSingleton = () => {
  return new AppServiceClass();
};
export const appService = globalThis.AppService ?? appServiceSingleton();
