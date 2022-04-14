import { NextFunction, Request, Response } from 'express';
import si from 'systeminformation';
import { appNames } from '../../config/apps';
import { AppConfig } from '../../config/types';
import { createFolder, fileExists, readJsonFile, writeFile, readFile } from '../fs/fs.helpers';
import { checkAppExists, checkAppRequirements, checkEnvFile, ensureAppState, getInitalFormValues, runAppScript } from './apps.helpers';

type AppsState = { installed: string };

const getStateFile = (): AppsState => {
  return readJsonFile('/state/apps.json');
};

const generateEnvFile = (appName: string, form: Record<string, string>) => {
  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);
  const baseEnvFile = readFile('/.env').toString();
  let envFile = `${baseEnvFile}\nAPP_PORT=${configFile.port}\n`;

  Object.keys(configFile.form_fields).forEach((key) => {
    const value = form[key];

    if (value) {
      const envVar = configFile.form_fields[key].env_variable;
      envFile += `${envVar}=${value}\n`;
    } else if (configFile.form_fields[key].required) {
      throw new Error(`Variable ${key} is required`);
    }
  });

  writeFile(`/app-data/${appName}/app.env`, envFile);
};

const uninstallApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    checkAppExists(appName);
    ensureAppState(appName, false);

    // Run script
    await runAppScript(['uninstall', appName]);

    res.status(200).json({ message: 'App uninstalled successfully' });
  } catch (e) {
    next(e);
  }
};

const stopApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    checkAppExists(appName);
    // Run script
    await runAppScript(['stop', appName]);

    res.status(200).json({ message: 'App stopped successfully' });
  } catch (e) {
    next(e);
  }
};

const updateAppConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;
    const { form } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    checkAppExists(appName);
    generateEnvFile(appName, form);

    res.status(200).json({ message: 'App updated successfully' });
  } catch (e) {
    next(e);
  }
};

const getAppInfo = async (req: Request, res: Response<AppConfig>, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('App name is required');
    }

    const dockerContainers = await si.dockerContainers();
    const configFile: AppConfig = readJsonFile(`/apps/${id}/config.json`);

    const state = getStateFile();
    const installed: string[] = state.installed.split(' ').filter(Boolean);
    configFile.installed = installed.includes(id);
    configFile.status = (dockerContainers.find((container) => container.name === `${id}`)?.state as 'running') || 'stopped';

    res.status(200).json(configFile);
  } catch (e) {
    next(e);
  }
};

const listApps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apps = appNames
      .map((app) => {
        try {
          return readJsonFile(`/apps/${app}/config.json`);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const dockerContainers = await si.dockerContainers();

    const state = getStateFile();
    const installed: string[] = state.installed.split(' ').filter(Boolean);

    apps.forEach((app) => {
      app.installed = installed.includes(app.id);
      app.status = dockerContainers.find((container) => container.name === `${app.id}`)?.state || 'stopped';
    });

    res.status(200).json(apps);
  } catch (e) {
    next(e);
  }
};

const startApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    checkAppExists(appName);
    checkEnvFile(appName);

    // Run script
    await runAppScript(['start', appName]);

    ensureAppState(appName, true);

    res.status(200).json({ message: 'App started successfully' });
  } catch (e) {
    next(e);
  }
};

const installApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { form } = req.body;

    if (!id) {
      throw new Error('App name is required');
    }

    const appIsAvailable = appNames.includes(id);

    if (!appIsAvailable) {
      throw new Error(`App ${id} not available`);
    }

    const appExists = fileExists(`/app-data/${id}`);

    if (appExists) {
      await startApp(req, res, next);
    } else {
      const appIsValid = await checkAppRequirements(id);

      if (!appIsValid) {
        throw new Error(`App ${id} requirements not met`);
      }

      // Create app folder
      createFolder(`/app-data/${id}`);

      // Create env file
      generateEnvFile(id, form);
      ensureAppState(id, true);

      // Run script
      await runAppScript(['install', id]);

      res.status(200).json({ message: 'App installed successfully' });
    }
  } catch (e) {
    next(e);
  }
};

const initalFormValues = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error('App name is required');
    }

    res.status(200).json(getInitalFormValues(id));
  } catch (e) {
    next(e);
  }
};

const AppController = {
  uninstallApp,
  installApp,
  stopApp,
  updateAppConfig,
  getAppInfo,
  listApps,
  startApp,
  initalFormValues,
};

export default AppController;
