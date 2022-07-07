import { createFolder, readFile, readJsonFile } from '../fs/fs.helpers';
import { checkAppRequirements, checkEnvFile, generateEnvFile, getAvailableApps, runAppScript } from './apps.helpers';
import { AppInfo, AppStatusEnum, ListAppsResonse } from './apps.types';
import App from './app.entity';
import datasource from '../../config/datasource';

const startAllApps = async (): Promise<void> => {
  const apps = await App.find({ where: { status: AppStatusEnum.RUNNING } });

  await Promise.all(
    apps.map(async (app) => {
      // Regenerate env file
      generateEnvFile(app.id, app.config);
      checkEnvFile(app.id);

      await App.update({ id: app.id }, { status: AppStatusEnum.STARTING });
      await runAppScript(['start', app.id]);
      await App.update({ id: app.id }, { status: AppStatusEnum.RUNNING });
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
  await runAppScript(['start', appName]);
  const result = await datasource.createQueryBuilder().update(App).set({ status: AppStatusEnum.RUNNING }).where('id = :id', { id: appName }).returning('*').execute();

  return result.raw[0];
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

  const result = await datasource.createQueryBuilder().update(App).set({ status: AppStatusEnum.RUNNING }).where('id = :id', { id }).returning('*').execute();

  return result.raw[0];
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

  apps.forEach((app) => {
    app.description = readFile(`/apps/${app.id}/metadata/description.md`);
  });

  return { apps: apps.sort((a, b) => a.name.localeCompare(b.name)), total: apps.length };
};

const updateAppConfig = async (id: string, form: Record<string, string>): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  generateEnvFile(id, form);
  const result = await datasource.createQueryBuilder().update(App).set({ config: form }).where('id = :id', { id }).returning('*').execute();

  return result.raw[0];
};

const stopApp = async (id: string): Promise<App> => {
  let app = await App.findOne({ where: { id } });

  if (!app) {
    throw new Error(`App ${id} not found`);
  }

  // Run script
  await App.update({ id }, { status: AppStatusEnum.STOPPING });
  await runAppScript(['stop', id]);
  const result = await datasource.createQueryBuilder().update(App).set({ status: AppStatusEnum.STOPPED }).where('id = :id', { id }).returning('*').execute();
  return result.raw[0];
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
  await runAppScript(['uninstall', id]);
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
