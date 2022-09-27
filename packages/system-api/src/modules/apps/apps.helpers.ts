import portUsed from 'tcp-port-used';
import { fileExists, getSeed, readdirSync, readFile, readJsonFile, runScript, writeFile } from '../fs/fs.helpers';
import InternalIp from 'internal-ip';
import crypto from 'crypto';
import { AppInfo, AppStatusEnum } from './apps.types';
import logger from '../../config/logger/logger';
import App from './app.entity';
import { getConfig } from '../../core/config/TipiConfig';
import fs from 'fs-extra';

export const checkAppRequirements = async (appName: string) => {
  let valid = true;

  const configFile: AppInfo | null = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appName}/config.json`);

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
  const envFile = readFile(`/app/storage/app-data/${appName}/app.env`).toString();
  const envVars = envFile.split('\n');
  const envVarsMap = new Map<string, string>();

  envVars.forEach((envVar) => {
    const [key, value] = envVar.split('=');
    envVarsMap.set(key, value);
  });

  return envVarsMap;
};

export const checkEnvFile = (appName: string) => {
  const configFile: AppInfo | null = readJsonFile(`/app/storage/apps/${appName}/config.json`);
  const envMap = getEnvMap(appName);

  configFile?.form_fields?.forEach((field) => {
    const envVar = field.env_variable;
    const envVarValue = envMap.get(envVar);

    if (!envVarValue && field.required) {
      throw new Error('New info needed. App config needs to be updated');
    }
  });
};

export const runAppScript = async (params: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/runtipi/scripts/app.sh', [...params], (err: string) => {
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

export const generateEnvFile = (app: App) => {
  const configFile: AppInfo | null = readJsonFile(`/app/storage/apps/${app.id}/config.json`);

  if (!configFile) {
    throw new Error(`App ${app.id} not found`);
  }

  const baseEnvFile = readFile('/runtipi/.env').toString();
  let envFile = `${baseEnvFile}\nAPP_PORT=${configFile.port}\n`;
  const envMap = getEnvMap(app.id);

  configFile.form_fields?.forEach((field) => {
    const formValue = app.config[field.env_variable];
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

  if (app.exposed && app.domain) {
    envFile += 'APP_EXPOSED=true\n';
    envFile += `APP_DOMAIN=${app.domain}\n`;
    envFile += 'APP_PROTOCOL=https\n';
  } else {
    envFile += `APP_DOMAIN=${getConfig().internalIp}:${configFile.port}\n`;
  }

  // Create app-data folder if it doesn't exist
  if (!fs.existsSync(`/app/storage/app-data/${app.id}`)) {
    fs.mkdirSync(`/app/storage/app-data/${app.id}`, { recursive: true });
  }

  writeFile(`/app/storage/app-data/${app.id}/app.env`, envFile);
};

export const getAvailableApps = async (): Promise<string[]> => {
  const apps: string[] = [];

  const appsDir = readdirSync(`/runtipi/repos/${getConfig().appsRepoId}/apps`);

  appsDir.forEach((app) => {
    if (fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${app}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${app}/config.json`);

      if (configFile.available) {
        apps.push(app);
      }
    }
  });

  return apps;
};

export const getAppInfo = (id: string, status?: AppStatusEnum): AppInfo | null => {
  try {
    // Check if app is installed
    const installed = typeof status !== 'undefined' && status !== AppStatusEnum.MISSING;

    if (installed && fileExists(`/app/storage/apps/${id}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/app/storage/apps/${id}/config.json`);
      configFile.description = readFile(`/app/storage/apps/${id}/metadata/description.md`).toString();
      return configFile;
    } else if (fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`);
      configFile.description = readFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/metadata/description.md`);

      if (configFile.available) {
        return configFile;
      }
    }

    return null;
  } catch (e) {
    console.error(e);
    throw new Error(`Error loading app ${id}`);
  }
};

export const getUpdateInfo = async (id: string) => {
  const app = await App.findOne({ where: { id } });

  const doesFileExist = fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}`);

  if (!app || !doesFileExist) {
    return null;
  }

  const repoConfig: AppInfo = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`);

  return {
    current: app.version,
    latest: repoConfig.tipi_version,
    dockerVersion: repoConfig.version,
  };
};
