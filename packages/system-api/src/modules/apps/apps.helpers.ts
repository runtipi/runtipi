import portUsed from 'tcp-port-used';
import p from 'p-iteration';
import { AppConfig } from '../../config/types';
import { fileExists, readdirSync, readFile, readJsonFile, runScript, writeFile } from '../fs/fs.helpers';
import InternalIp from 'internal-ip';
import config from '../../config';

type AppsState = { installed: string };

export const checkAppRequirements = async (appName: string) => {
  let valid = true;
  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);

  if (configFile.requirements?.ports) {
    await p.forEachSeries(configFile.requirements.ports, async (port: number) => {
      const ip = await InternalIp.v4();
      const used = await portUsed.check(port, ip);

      if (used) valid = false;
    });
  }

  return valid;
};

export const getEnvMap = (appName: string): Map<string, string> => {
  const envFile = readFile(`/app-data/${appName}/app.env`).toString();
  const envVars = envFile.split('\n');
  const envVarsMap = new Map<string, string>();

  envVars.forEach((envVar) => {
    const [key, value] = envVar.split('=');
    envVarsMap.set(key, value);
  });

  return envVarsMap;
};

export const checkEnvFile = (appName: string) => {
  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);
  const envMap = getEnvMap(appName);

  Object.keys(configFile.form_fields).forEach((key) => {
    const envVar = configFile.form_fields[key].env_variable;
    const envVarValue = envMap.get(envVar);

    if (!envVarValue && configFile.form_fields[key].required) {
      throw new Error('New info needed. App config needs to be updated');
    }
  });
};

export const getInitalFormValues = (appName: string): Record<string, string> => {
  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);
  const envMap = getEnvMap(appName);
  const formValues: Record<string, string> = {};

  Object.keys(configFile.form_fields).forEach((key) => {
    const envVar = configFile.form_fields[key].env_variable;
    const envVarValue = envMap.get(envVar);

    if (envVarValue) {
      formValues[key] = envVarValue;
    }
  });

  return formValues;
};

export const checkAppExists = (appName: string) => {
  const appExists = fileExists(`/app-data/${appName}`);

  if (!appExists) {
    throw new Error(`App ${appName} not installed`);
  }
};

export const runAppScript = (params: string[], processClbk?: (data: string) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const process = runScript('/scripts/app.sh', [...params, config.ROOT_FOLDER_HOST], (err: string) => {
      if (err) {
        reject(err);
      }

      resolve();
    });

    if (processClbk) {
      process.stdout?.on('data', (data: string) => {
        processClbk?.(data);
      });
    }
  });
};

export const ensureAppState = (appName: string, installed: boolean) => {
  const state = readJsonFile('/state/apps.json');

  if (installed) {
    if (state.installed.indexOf(appName) === -1) {
      state.installed += ` ${appName}`;
      writeFile('/state/apps.json', JSON.stringify(state));
    }
  } else {
    if (state.installed.indexOf(appName) !== -1) {
      state.installed = state.installed.replace(`${appName}`, '');
      writeFile('/state/apps.json', JSON.stringify(state));
    }
  }
};

export const generateEnvFile = (appName: string, form: Record<string, string>) => {
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

export const getStateFile = (): AppsState => {
  return readJsonFile('/state/apps.json');
};

export const getAvailableApps = (): string[] => {
  const apps: string[] = [];

  const appsDir = readdirSync('/apps');

  appsDir.forEach((app) => {
    if (fileExists(`/apps/${app}/config.json`)) {
      const configFile: AppConfig = readJsonFile(`/apps/${app}/config.json`);

      if (configFile.available) {
        apps.push(app);
      }
    }
  });

  return apps;
};
