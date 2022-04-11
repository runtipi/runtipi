import { Request, Response } from 'express';
import { AppConfig } from '../../config/types';
import { createFolder, fileExists, readJsonFile, writeFile, copyFile, runScript, deleteFolder } from '../fs/fs.helpers';

type AppsState = { installed: string };

const getStateFile = (): AppsState => {
  return readJsonFile('/state/apps.json');
};

const generateEnvFile = (appName: string, form: Record<string, string>) => {
  const appExists = fileExists(`/app-data/${appName}`);

  if (!appExists) {
    throw new Error(`App ${appName} not installed`);
  }

  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);
  let envFile = '';

  Object.keys(configFile.form_fields).forEach((key) => {
    const value = form[key];

    if (value) {
      const envVar = configFile.form_fields[key].env_variable;
      envFile += `${envVar}=${value}\n`;
    } else if (configFile.form_fields[key].required) {
      throw new Error(`Variable ${key} is required`);
    }
  });

  writeFile(`/app-data/${appName}/.env`, envFile);
};

const installApp = (req: Request, res: Response) => {
  try {
    const { appName, form } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (appExists) {
      throw new Error(`App ${appName} already installed`);
    }

    // Create app folder
    createFolder(`/app-data/${appName}`);
    // Copy default app files from app-data folder
    copyFile(`/apps/${appName}/data`, `/app-data/${appName}/data`);

    // Create env file
    generateEnvFile(appName, form);
    const state = getStateFile();
    state.installed += ` ${appName}`;
    writeFile('/state/apps.json', JSON.stringify(state));

    // Run script
    runScript('/scripts/app.sh', ['install', appName]);

    res.status(200).json({ message: 'App installed successfully' });
  } catch (e) {
    res.status(500).send(e);
  }
};

const uninstallApp = (req: Request, res: Response) => {
  try {
    const { appName } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Delete app folder
    deleteFolder(`/app-data/${appName}`);

    // Remove app from apps.json
    const state = getStateFile();
    state.installed = state.installed.replace(` ${appName}`, '');
    writeFile('/state/apps.json', JSON.stringify(state));

    // Run script
    runScript('/scripts/app.sh', ['uninstall', appName]);

    res.status(200).json({ message: 'App uninstalled successfully' });
  } catch (e) {
    res.status(500).send(e);
  }
};

const stopApp = (req: Request, res: Response) => {
  try {
    const { appName } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Run script
    runScript('/scripts/app.sh', ['stop', appName]);

    res.status(200).json({ message: 'App stopped successfully' });
  } catch (e) {
    res.status(500).end(e);
  }
};

const updateAppConfig = (req: Request, res: Response) => {
  try {
    const { appName, form } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    generateEnvFile(appName, form);

    // Run script
    runScript('/scripts/app.sh', ['stop', appName]);
    runScript('/scripts/app.sh', ['start', appName]);

    res.status(200).json({ message: 'App updated successfully' });
  } catch (e) {
    res.status(500).end(e);
  }
};

const installedApps = (req: Request, res: Response) => {
  try {
    const apps = readJsonFile('/state/apps.json');
    const appNames = apps.installed.split(' ');

    if (appNames.length === 0) {
      res.status(204).json([]);
    } else {
      res.status(200).json(appNames);
    }
  } catch (e) {
    res.status(500).end(e);
  }
};

const getAppInfo = (req: Request, res: Response<AppConfig>) => {
  try {
    const { appName } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);

    res.status(200).json(configFile);
  } catch (e) {
    res.status(500).end(e);
  }
};

const AppController = {
  uninstallApp,
  installApp,
  stopApp,
  updateAppConfig,
  installedApps,
  getAppInfo,
};

export default AppController;
