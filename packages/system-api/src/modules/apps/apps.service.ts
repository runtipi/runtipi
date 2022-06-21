import { AppStatusEnum } from '@runtipi/common';
import { createFolder, readFile, readJsonFile } from '../fs/fs.helpers';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAvailableApps, getStateFile, runAppScript } from './apps.helpers';
import { AppInfo, AppResponse, ListAppsResonse } from './apps.types';
import App from './app.entity';

const startApp = async (appName: string): Promise<App> => {
  let app = await App.findOne({ where: { id: appName } });

  if (!app) {
    throw new Error(`App ${appName} not found`);
  }

  checkEnvFile(appName);

  // Regenerate env file
  generateEnvFile(appName, app.config);

  await App.update({ id: appName }, { status: AppStatusEnum.STARTING });
  // Run script
  await runAppScript(['start', appName]);
  await App.update({ id: appName }, { status: AppStatusEnum.RUNNING });

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
    await runAppScript(['install', id]);
  }

  await App.update({ id }, { status: AppStatusEnum.RUNNING });
  app = (await App.findOne({ where: { id } })) as App;
  return app;
};

const listApps = async (): Promise<ListAppsResonse> => {
  const apps: AppInfo[] = getAvailableApps()
    .map((app) => {
      try {
        return readJsonFile(`/apps/${app}/config.json`);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  const state = getStateFile();
  const installed: string[] = state.installed.split(' ').filter(Boolean);

  apps.forEach((app) => {
    app.installed = installed.includes(app.id);
    app.description = readFile(`/apps/${app.id}/metadata/description.md`);
  });

  return { apps, total: apps.length };
};

const getAppInfo = (id: string): AppInfo => {
  const configFile: AppInfo = readJsonFile(`/apps/${id}/config.json`);

  const state = getStateFile();
  const installed: string[] = state.installed.split(' ').filter(Boolean);
  configFile.installed = installed.includes(id);
  configFile.description = readFile(`/apps/${id}/metadata/description.md`);

  return configFile;
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
  // Run script
  await App.update({ id }, { status: AppStatusEnum.STOPPING });
  await runAppScript(['stop', id]);
  await App.update({ id }, { status: AppStatusEnum.STOPPED });
  app = (await App.findOne({ where: { id } })) as App;

  return app;
};

const uninstallApp = async (id: string): Promise<boolean> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }
  if (app.status === AppStatusEnum.RUNNING) {
    await stopApp(id);
  }

  await App.update({ id }, { status: AppStatusEnum.UNINSTALLING });
  // Run script
  await runAppScript(['uninstall', id]);
  await App.delete({ id });

  return true;
};

const getApp = async (id: string): Promise<AppResponse> => {
  const app = await App.findOne({ where: { id } });

  return {
    info: getAppInfo(id),
    app,
  };
};

export default { installApp, startApp, listApps, getApp, updateAppConfig, stopApp, uninstallApp };
