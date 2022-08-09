import portUsed from 'tcp-port-used';
import { fileExists, getSeed, readdirSync, readFile, readJsonFile, runScript, writeFile } from '../fs/fs.helpers';
import InternalIp from 'internal-ip';
import crypto from 'crypto';
import config from '../../config';
import { AppInfo } from './apps.types';
import logger from '../../config/logger/logger';
import App from './app.entity';

export const checkAppRequirements = async (appName: string) => {
  let valid = true;

  const configFile: AppInfo | null = readJsonFile(`/apps/${appName}/config.json`);

  if (!configFile) {
    throw new Error(`App ${appName} not found`);
  }

  if (configFile?.requirements?.ports) {
    for (const port of configFile.requirements.ports) {
      const ip = await InternalIp.v4();
      const used = await portUsed.check(port, ip);

      if (used) valid = false;
    }
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
  const configFile: AppInfo | null = readJsonFile(`/apps/${appName}/config.json`);
  const envMap = getEnvMap(appName);

  configFile?.form_fields?.forEach((field) => {
    const envVar = field.env_variable;
    const envVarValue = envMap.get(envVar);

    if (!envVarValue && field.required) {
      throw new Error('New info needed. App config needs to be updated');
    }
  });
};

export const checkAppExists = (appName: string) => {
  const appExists = fileExists(`/app-data/${appName}`);

  if (!appExists) {
    throw new Error(`App ${appName} not installed`);
  }
};

export const runAppScript = async (params: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/scripts/app.sh', [...params, config.ROOT_FOLDER_HOST, config.APPS_REPO_ID], (err: string) => {
      if (err) {
        logger.error(err);
        reject(err);
      }

      resolve();
    });
  });
};

const getEntropy = (name: string, length: number) => {
  const hash = crypto.createHash('sha256');
  hash.update(name + getSeed());
  return hash.digest('hex').substring(0, length);
};

export const generateEnvFile = (appName: string, form: Record<string, string>) => {
  const configFile: AppInfo | null = readJsonFile(`/apps/${appName}/config.json`);

  if (!configFile) {
    throw new Error(`App ${appName} not found`);
  }

  const baseEnvFile = readFile('/.env').toString();
  let envFile = `${baseEnvFile}\nAPP_PORT=${configFile.port}\n`;
  const envMap = getEnvMap(appName);

  configFile.form_fields?.forEach((field) => {
    const formValue = form[field.env_variable];
    const envVar = field.env_variable;

    if (formValue) {
      envFile += `${envVar}=${formValue}\n`;
    } else if (field.type === 'random') {
      if (envMap.has(envVar)) {
        envFile += `${envVar}=${envMap.get(envVar)}\n`;
      } else {
        const length = field.min || 32;
        const randomString = getEntropy(field.env_variable, length);

        envFile += `${envVar}=${randomString}\n`;
      }
    } else if (field.required) {
      throw new Error(`Variable ${field.env_variable} is required`);
    }
  });

  writeFile(`/app-data/${appName}/app.env`, envFile);
};

export const getAvailableApps = async (): Promise<string[]> => {
  const apps: string[] = [];

  const appsDir = readdirSync(`/repos/${config.APPS_REPO_ID}/apps`);

  appsDir.forEach((app) => {
    if (fileExists(`/repos/${config.APPS_REPO_ID}/apps/${app}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/repos/${config.APPS_REPO_ID}/apps/${app}/config.json`);

      if (configFile.available) {
        apps.push(app);
      }
    }
  });

  return apps;
};

export const getAppInfo = (id: string): AppInfo => {
  try {
    const repoId = config.APPS_REPO_ID;

    if (fileExists(`/apps/${id}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/apps/${id}/config.json`);
      configFile.description = readFile(`/apps/${id}/metadata/description.md`).toString();
      return configFile;
    }

    if (fileExists(`/repos/${repoId}`)) {
      const configFile: AppInfo = readJsonFile(`/repos/${repoId}/apps/${id}/config.json`);
      configFile.description = readFile(`/repos/${repoId}/apps/${id}/metadata/description.md`);

      if (configFile.available) {
        return configFile;
      }
    }

    throw new Error('No repository found');
  } catch (e) {
    throw new Error(`Error loading app ${id}`);
  }
};

export const getUpdateInfo = async (id: string) => {
  const app = await App.findOne({ where: { id } });

  if (!app) {
    return null;
  }

  const repoConfig: AppInfo = readJsonFile(`/repos/${config.APPS_REPO_ID}/apps/${id}/config.json`);

  return {
    current: app.version,
    latest: repoConfig.tipi_version,
  };
};
