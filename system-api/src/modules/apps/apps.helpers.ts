import portUsed from 'tcp-port-used';
import p from 'p-iteration';
import { AppConfig } from '../../config/types';
import { fileExists, readFile, readJsonFile, runScript, writeFile } from '../fs/fs.helpers';
import { internalIpV4 } from 'internal-ip';

export const checkAppRequirements = async (appName: string) => {
  let valid = true;
  const configFile: AppConfig = readJsonFile(`/apps/${appName}/config.json`);

  if (configFile.requirements?.ports) {
    await p.forEachSeries(configFile.requirements.ports, async (port: number) => {
      const ip = await internalIpV4();
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

export const runAppScript = (params: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/scripts/app.sh', params, (err: string) => {
      if (err) {
        reject(err);
      }

      resolve();
    });
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
      state.installed = state.installed.replace(` ${appName}`, '');
      writeFile('/state/apps.json', JSON.stringify(state));
    }
  }
};
