import { createFolder, readFile, readJsonFile } from '../fs/fs.helpers';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAvailableApps, runAppScript } from './apps.helpers';
import { AppInfo, AppStatusEnum, ListAppsResonse } from './apps.types';
import App from './app.entity';
import logger from '../../config/logger/logger';

const sortApps = (a: AppInfo, b: AppInfo) => a.name.localeCompare(b.name);

const startAllApps = async (): Promise<void> => {
  const apps = await App.find({ where: { status: AppStatusEnum.RUNNING } });

  await Promise.all(
    apps.map(async (app) => {
      // Regenerate env file
      try {
        generateEnvFile(app.id, app.config);
        checkEnvFile(app.id);

        await App.update({ id: app.id }, { status: AppStatusEnum.STARTING });

        await runAppScript(['start', app.id]);
        await App.update({ id: app.id }, { status: AppStatusEnum.RUNNING });
      } catch (e) {
        await App.update({ id: app.id }, { status: AppStatusEnum.STOPPED });
        logger.error(e);
      }
    }),
  );
};

const startApp = async (appName: string): Promise<App> => {
  let app = await App.findOne({ where: { id: appName } });

  if (!app) {
    throw new Error(`App ${appName} not found`);
  }

  // Regenerate env file
  generateEnvFile(appName, app.config);

  checkEnvFile(appName);

  await App.update({ id: appName }, { status: AppStatusEnum.STARTING });
  // Run script
  try {
    await runAppScript(['start', appName]);
    await App.update({ id: appName }, { status: AppStatusEnum.RUNNING });
  } catch (e) {
    await App.update({ id: appName }, { status: AppStatusEnum.STOPPED });
    throw e;
  }

  app = (await App.findOne({ where: { id: appName } })) as App;

  return app;
};

const installApp = async (id: string, form: Record<string, string>): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (app) {
    await startApp(id);
  } else {
    const appIsValid = await checkAppRequirements(id);

    if (!appIsValid) {
      throw new Error(`App ${id} requirements not met`);
    }

    // Create app folder
    createFolder(`/app-data/${id}`);

    // Create env file
    generateEnvFile(id, form);

    app = await App.create({ id, status: AppStatusEnum.INSTALLING, config: form }).save();

    // Run script
    try {
      await runAppScript(['install', id]);
    } catch (e) {
      await App.delete({ id });
      throw e;
    }
  }

  await App.update({ id }, { status: AppStatusEnum.RUNNING });
  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

const listApps = async (): Promise<ListAppsResonse> => {
  const folders: string[] = await getAvailableApps();

  const apps: AppInfo[] = folders
    .map((app) => {
      try {
        return readJsonFile(`/apps/${app}/config.json`);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  apps.forEach((app) => {
    app.description = readFile(`/apps/${app.id}/metadata/description.md`);
  });

  return { apps: apps.sort(sortApps), total: apps.length };
};

const updateAppConfig = async (id: string, form: Record<string, string>): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  generateEnvFile(id, form);
  await App.update({ id }, { config: form });
  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

const stopApp = async (id: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  // Run script
  await App.update({ id }, { status: AppStatusEnum.STOPPING });

  try {
    await runAppScript(['stop', id]);
    await App.update({ id }, { status: AppStatusEnum.STOPPED });
  } catch (e) {
    await App.update({ id }, { status: AppStatusEnum.RUNNING });
    throw e;
  }

  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

const uninstallApp = async (id: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }
  if (app.status === AppStatusEnum.RUNNING) {
    await stopApp(id);
  }

  await App.update({ id }, { status: AppStatusEnum.UNINSTALLING });
  // Run script
  try {
    await runAppScript(['uninstall', id]);
  } catch (e) {
    await App.update({ id }, { status: AppStatusEnum.STOPPED });
    throw e;
  }

  await App.delete({ id });

  return { id, status: AppStatusEnum.MISSING, config: {} } as App;
};

const getApp = async (id: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    app = { id, status: AppStatusEnum.MISSING, config: {} } as App;
  }

  return app;
};

export default { installApp, startApp, listApps, getApp, updateAppConfig, stopApp, uninstallApp, startAllApps };
