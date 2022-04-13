import { NextFunction, Request, Response } from 'express';
import si from 'systeminformation';
import { appNames } from '../../config/apps';
import { AppConfig } from '../../config/types';
import { createFolder, fileExists, readJsonFile, writeFile, runScript, deleteFolder, readFile } from '../fs/fs.helpers';

type AppsState = { installed: string };

const getStateFile = (): AppsState => {
  return readJsonFile('/state/apps.json');
};

const generateEnvFile = (appName: string, form: Record<string, string>) => {
  const appExists = fileExists(`/app-data/${appName}`);
  const baseEnvFile = readFile('/.env');

  if (!appExists) {
    throw new Error(`App ${appName} not installed`);
  }

  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);
  let envFile = `${baseEnvFile}\n`;

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

const installApp = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { form } = req.body;

    if (!id) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${id}`);

    if (appExists) {
      throw new Error(`App ${id} already installed`);
    }

    const appIsAvailable = appNames.includes(id);

    if (!appIsAvailable) {
      throw new Error(`App ${id} not available`);
    }

    // Create app folder
    createFolder(`/app-data/${id}`);
    // Copy default app files from app-data folder
    // copyFile(`/apps/${id}/data/`, `/app-data/${id}/data`);

    // Create env file
    generateEnvFile(id, form);
    const state = getStateFile();
    state.installed += ` ${id}`;
    writeFile('/state/apps.json', JSON.stringify(state));

    // Run script
    runScript('/scripts/app.sh', ['install', id], (err: any) => {
      if (err) {
        throw new Error(err);
      }

      res.status(200).json({ message: 'App installed successfully' });
    });
  } catch (e) {
    next(e);
  }
};

const uninstallApp = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Remove app from apps.json
    const state = getStateFile();
    state.installed = state.installed.replace(` ${appName}`, '');

    writeFile('/state/apps.json', JSON.stringify(state));

    // Run script
    runScript('/scripts/app.sh', ['uninstall', appName], (err: any) => {
      if (err) {
        throw new Error(err);
      }

      res.status(200).json({ message: 'App uninstalled successfully' });
    });
  } catch (e) {
    next(e);
  }
};

const stopApp = (req: Request, res: Response) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Run script
    runScript('/scripts/app.sh', ['stop', appName], (err: string) => {
      if (err) {
        throw new Error(err);
      }

      res.status(200).json({ message: 'App stopped successfully' });
    });
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
    runScript('/scripts/app.sh', ['stop', appName], (err: string) => {
      if (err) {
        throw new Error(err);
      }

      runScript('/scripts/app.sh', ['start', appName], (error: string) => {
        if (error) {
          throw new Error(error);
        }

        res.status(200).json({ message: 'App updated successfully' });
      });
    });
  } catch (e) {
    res.status(500).end(e);
  }
};

const getAppInfo = async (req: Request, res: Response<AppConfig>) => {
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
    res.status(500).end(e);
  }
};

const listApps = async (req: Request, res: Response) => {
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
    res.status(500).end(e);
  }
};

const startApp = (req: Request, res: Response) => {
  try {
    const { id: appName } = req.params;

    if (!appName) {
      throw new Error('App name is required');
    }

    const appExists = fileExists(`/app-data/${appName}`);

    if (!appExists) {
      throw new Error(`App ${appName} not installed`);
    }

    // Run script
    runScript('/scripts/app.sh', ['start', appName], (err: string) => {
      if (err) {
        throw new Error(err);
      }

      res.status(200).json({ message: 'App started successfully' });
    });
  } catch (e) {
    res.status(500).end(e);
  }
};
// console.log('');

const AppController = {
  uninstallApp,
  installApp,
  stopApp,
  updateAppConfig,
  getAppInfo,
  listApps,
  startApp,
};

export default AppController;
