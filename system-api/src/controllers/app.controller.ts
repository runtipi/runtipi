import { Request, Response } from 'express';
import fs from 'fs';
import process from 'child_process';
import config from '../config';
import { AppConfig } from '../config/types';

const appScript = `${config.ROOT_FOLDER}/scripts/app.sh`;

const getAppFolder = (appName: string) => `${config.ROOT_FOLDER}/apps/${appName}`;
const getDataFolder = (appName: string) => `${config.ROOT_FOLDER}/app-data/${appName}`;

const getStateFile = () => {
  // Add app to apps.json
  const rawFile = fs.readFileSync(`${config.ROOT_FOLDER}/state/apps.json`).toString();
  let apps = JSON.parse(rawFile);

  return apps;
};

const generateEnvFile = (appName: string, form: Record<string, string>) => {
  const appExists = fs.existsSync(getDataFolder(appName));

  if (!appExists) {
    throw new Error(`App ${appName} not installed`);
  }

  const rawFile = fs.readFileSync(`${getAppFolder(appName)}/config.json`).toString();
  let configFile: AppConfig = JSON.parse(rawFile);
  let envFile = '';

  Object.keys(configFile.form_fields).forEach(key => {
    const value = form[key];

    if (value) {
      const envVar = configFile.form_fields[key].env_variable;
      envFile += `${envVar}=${value}\n`;
    } else if (configFile[key].required) {
      throw new Error(`Variable ${key} is required`);
    }
  });

  fs.writeFileSync(`${getDataFolder(appName)}/.env`, envFile);
};

const installApp = (req: Request, res: Response) => {
  try {
    const { appName, form } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appDataFolder = `${config.ROOT_FOLDER}/app-data/${appName}`;
    const appFolder = `${config.ROOT_FOLDER}/apps/${appName}`;

    const appExists = fs.existsSync(appDataFolder);

    if (appExists) {
      throw new Error(`App ${appName} already installed`);
    }

    // Create app folder
    fs.mkdirSync(appFolder);

    // Copy default app files from app-data folder
    fs.copyFileSync(`${appFolder}/data`, `${appDataFolder}/data`);

    generateEnvFile(appName, form);

    const state = getStateFile();
    state.installed += ` ${appName}`;

    fs.writeFileSync(`${config.ROOT_FOLDER}/state/apps.json`, JSON.stringify(state));

    // Run script
    process.spawnSync(appScript, ['install', appName], {});

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
    const appExists = fs.existsSync(getDataFolder(appName));

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Delete app folder
    fs.rmdirSync(getAppFolder(appName), { recursive: true });

    // Remove app from apps.json
    const state = getStateFile();
    state.installed = state.installed.replace(` ${appName}`, '');
    fs.writeFileSync(`${config.ROOT_FOLDER}/state/apps.json`, JSON.stringify(state));

    // Run script
    process.spawnSync(appScript, ['uninstall', appName], {});

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

    const appExists = fs.existsSync(getDataFolder(appName));

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Run script
    process.spawnSync(appScript, ['stop', appName], {});

    res.status(200).json({ message: 'App stopped successfully' });
  } catch (e) {
    res.status(500).send(e);
  }
};

const updateAppConfig = (req: Request, res: Response) => {
  try {
    const { appName, form } = req.body;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fs.existsSync(getDataFolder(appName));

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    generateEnvFile(appName, form);

    // Run script
    process.spawnSync(appScript, ['stop', appName], {});
    process.spawnSync(appScript, ['start', appName], {});

    res.status(200).json({ message: 'App updated successfully' });
  } catch (e) {
    res.status(500).send(e);
  }
};

const installedApps = (req: Request, res: Response) => {
  try {
    const rawFile = fs.readFileSync(`${config.ROOT_FOLDER}/state/apps.json`).toString();
    const apps = JSON.parse(rawFile);

    const appNames = apps.installed.split(' ');

    res.status(200).json(appNames);
  } catch (e) {
    res.status(500).send(e);
  }
};

export default { uninstallApp, installApp, stopApp, updateAppConfig, installedApps };
