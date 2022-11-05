import validator from 'validator';
import { Not } from 'typeorm';
import { createFolder, readFile, readJsonFile } from '../fs/fs.helpers';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAvailableApps, ensureAppFolder } from './apps.helpers';
import { AppInfo, AppStatusEnum, ListAppsResonse } from './apps.types';
import App from './app.entity';
import logger from '../../config/logger/logger';
import { getConfig } from '../../core/config/TipiConfig';
import { eventDispatcher, EventTypes } from '../../core/config/EventDispatcher';

const sortApps = (a: AppInfo, b: AppInfo) => a.name.localeCompare(b.name);
const filterApp = (app: AppInfo): boolean => {
  if (!app.supported_architectures) {
    return true;
  }

  const arch = getConfig().architecture;
  return app.supported_architectures.includes(arch);
};

const filterApps = (apps: AppInfo[]): AppInfo[] => apps.sort(sortApps).filter(filterApp);

/**
 * Start all apps which had the status RUNNING in the database
 */
const startAllApps = async (): Promise<void> => {
  const apps = await App.find({ where: { status: AppStatusEnum.RUNNING } });

  await Promise.all(
    apps.map(async (app) => {
      // Regenerate env file
      try {
        ensureAppFolder(app.id);
        generateEnvFile(app);
        checkEnvFile(app.id);

        await App.update({ id: app.id }, { status: AppStatusEnum.STARTING });

        eventDispatcher.dispatchEventAsync(EventTypes.APP, ['start', app.id]).then(({ success }) => {
          if (success) {
            App.update({ id: app.id }, { status: AppStatusEnum.RUNNING });
          } else {
            App.update({ id: app.id }, { status: AppStatusEnum.STOPPED });
          }
        });
      } catch (e) {
        await App.update({ id: app.id }, { status: AppStatusEnum.STOPPED });
        logger.error(e);
      }
    }),
  );
};

/**
 * Start an app
 * @param appName - id of the app to start
 * @returns - the app entity
 */
const startApp = async (appName: string): Promise<App> => {
  let app = await App.findOne({ where: { id: appName } });

  if (!app) {
    throw new Error(`App ${appName} not found`);
  }

  ensureAppFolder(appName);
  // Regenerate env file
  generateEnvFile(app);
  checkEnvFile(appName);

  await App.update({ id: appName }, { status: AppStatusEnum.STARTING });
  const { success, stdout } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['start', app.id]);

  if (success) {
    await App.update({ id: appName }, { status: AppStatusEnum.RUNNING });
  } else {
    await App.update({ id: appName }, { status: AppStatusEnum.STOPPED });
    throw new Error(`App ${appName} failed to start\nstdout: ${stdout}`);
  }

  app = (await App.findOne({ where: { id: appName } })) as App;

  return app;
};

/**
 * Given parameters, create a new app and start it
 * @param id - id of the app to stop
 * @param form - form data
 * @param exposed - if the app should be exposed
 * @param domain - domain to expose the app on
 * @returns - the app entity
 */
const installApp = async (id: string, form: Record<string, string>, exposed?: boolean, domain?: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (app) {
    await startApp(id);
  } else {
    if (exposed && !domain) {
      throw new Error('Domain is required if app is exposed');
    }

    if (domain && !validator.isFQDN(domain)) {
      throw new Error(`Domain ${domain} is not valid`);
    }

    ensureAppFolder(id, true);
    const appIsValid = await checkAppRequirements(id);

    if (!appIsValid) {
      throw new Error(`App ${id} requirements not met`);
    }

    // Create app folder
    createFolder(`/app/storage/app-data/${id}`);

    const appInfo: AppInfo | null = await readJsonFile(`/runtipi/apps/${id}/config.json`);

    if (!appInfo?.exposable && exposed) {
      throw new Error(`App ${id} is not exposable`);
    }

    if (exposed) {
      const appsWithSameDomain = await App.find({ where: { domain, exposed: true } });
      if (appsWithSameDomain.length > 0) {
        throw new Error(`Domain ${domain} already in use by app ${appsWithSameDomain[0].id}`);
      }
    }

    app = await App.create({ id, status: AppStatusEnum.INSTALLING, config: form, version: Number(appInfo?.tipi_version || 0), exposed: exposed || false, domain }).save();

    // Create env file
    generateEnvFile(app);

    // Run script
    const { success, stdout } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['install', id]);

    if (!success) {
      await App.delete({ id });
      throw new Error(`App ${id} failed to install\nstdout: ${stdout}`);
    }
  }

  await App.update({ id }, { status: AppStatusEnum.RUNNING });
  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

/**
 * List all apps available for installation
 * @returns - list of all apps available
 */
const listApps = async (): Promise<ListAppsResonse> => {
  const folders: string[] = await getAvailableApps();

  const apps: AppInfo[] = folders.map((app) => readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${app}/config.json`)).filter(Boolean);

  const filteredApps = filterApps(apps).map((app) => {
    const description = readFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${app.id}/metadata/description.md`);
    return { ...app, description };
  });

  return { apps: filteredApps, total: apps.length };
};

/**
 * Given parameters, updates an app config and regenerates the env file
 * @param id - id of the app to stop
 * @param form - form data
 * @param exposed - if the app should be exposed
 * @param domain - domain to expose the app on
 * @returns - the app entity
 */
const updateAppConfig = async (id: string, form: Record<string, string>, exposed?: boolean, domain?: string): Promise<App> => {
  if (exposed && !domain) {
    throw new Error('Domain is required if app is exposed');
  }

  if (domain && !validator.isFQDN(domain)) {
    throw new Error(`Domain ${domain} is not valid`);
  }

  const appInfo: AppInfo | null = await readJsonFile(`/runtipi/apps/${id}/config.json`);

  if (!appInfo?.exposable && exposed) {
    throw new Error(`App ${id} is not exposable`);
  }

  if (exposed) {
    const appsWithSameDomain = await App.find({ where: { domain, exposed: true, id: Not(id) } });
    if (appsWithSameDomain.length > 0) {
      throw new Error(`Domain ${domain} already in use by app ${appsWithSameDomain[0].id}`);
    }
  }

  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  await App.update({ id }, { config: form, exposed: exposed || false, domain });
  app = (await App.findOne({ where: { id } })) as App;

  generateEnvFile(app);
  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

/**
 * Stops an app
 * @param id - id of the app to stop
 * @returns - the app entity
 */
const stopApp = async (id: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  ensureAppFolder(id);
  generateEnvFile(app);

  // Run script
  await App.update({ id }, { status: AppStatusEnum.STOPPING });

  const { success, stdout } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['stop', id]);

  if (success) {
    await App.update({ id }, { status: AppStatusEnum.STOPPED });
  } else {
    await App.update({ id }, { status: AppStatusEnum.RUNNING });
    throw new Error(`App ${id} failed to stop\nstdout: ${stdout}`);
  }

  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

/**
 * Uninstalls an app
 * @param id - id of the app to uninstall
 * @returns - the app entity
 */
const uninstallApp = async (id: string): Promise<App> => {
  const app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }
  if (app.status === AppStatusEnum.RUNNING) {
    await stopApp(id);
  }

  ensureAppFolder(id);
  generateEnvFile(app);

  await App.update({ id }, { status: AppStatusEnum.UNINSTALLING });

  const { success, stdout } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['uninstall', id]);

  if (!success) {
    await App.update({ id }, { status: AppStatusEnum.STOPPED });
    throw new Error(`App ${id} failed to uninstall\nstdout: ${stdout}`);
  }

  await App.delete({ id });

  return { id, status: AppStatusEnum.MISSING, config: {} } as App;
};

/**
 * Get an app entity
 * @param id - id of the app
 * @returns - the app entity
 */
const getApp = async (id: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    app = { id, status: AppStatusEnum.MISSING, config: {}, exposed: false, domain: '' } as App;
  }

  return app;
};

/**
 * Updates an app to the latest version from repository
 * @param id - id of the app
 * @returns - the app entity
 */
const updateApp = async (id: string) => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  ensureAppFolder(id);
  generateEnvFile(app);

  await App.update({ id }, { status: AppStatusEnum.UPDATING });

  const { success, stdout } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['update', id]);

  if (success) {
    const appInfo: AppInfo | null = await readJsonFile(`/runtipi/apps/${id}/config.json`);
    await App.update({ id }, { status: AppStatusEnum.RUNNING, version: Number(appInfo?.tipi_version) });
  } else {
    await App.update({ id }, { status: AppStatusEnum.STOPPED });
    throw new Error(`App ${id} failed to update\nstdout: ${stdout}`);
  }

  await App.update({ id }, { status: AppStatusEnum.STOPPED });
  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

export default { installApp, startApp, updateApp, listApps, getApp, updateAppConfig, stopApp, uninstallApp, startAllApps };
