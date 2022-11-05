import crypto from 'crypto';
import fs from 'fs-extra';
import { deleteFolder, fileExists, getSeed, readdirSync, readFile, readJsonFile, writeFile } from '../fs/fs.helpers';
import { AppInfo, AppStatusEnum } from './apps.types';
import logger from '../../config/logger/logger';
import { getConfig } from '../../core/config/TipiConfig';
import { AppEntityType } from './app.types';

export const checkAppRequirements = async (appName: string) => {
  const configFile: AppInfo | null = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appName}/config.json`);

  if (!configFile) {
    throw new Error(`App ${appName} not found`);
  }

  if (configFile?.supported_architectures && !configFile.supported_architectures.includes(getConfig().architecture)) {
    throw new Error(`App ${appName} is not supported on this architecture`);
  }

  return true;
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
  const configFile: AppInfo | null = readJsonFile(`/runtipi/apps/${appName}/config.json`);
  const envMap = getEnvMap(appName);

  configFile?.form_fields?.forEach((field) => {
    const envVar = field.env_variable;
    const envVarValue = envMap.get(envVar);

    if (!envVarValue && field.required) {
      throw new Error('New info needed. App config needs to be updated');
    }
  });
};

const getEntropy = (name: string, length: number) => {
  const hash = crypto.createHash('sha256');
  hash.update(name + getSeed());
  return hash.digest('hex').substring(0, length);
};

export const generateEnvFile = (app: AppEntityType) => {
  const configFile: AppInfo | null = readJsonFile(`/runtipi/apps/${app.id}/config.json`);

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

    if (installed && fileExists(`/runtipi/apps/${id}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/runtipi/apps/${id}/config.json`);
      configFile.description = readFile(`/runtipi/apps/${id}/metadata/description.md`).toString();
      return configFile;
    }
    if (fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`);
      configFile.description = readFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/metadata/description.md`);

      if (configFile.available) {
        return configFile;
      }
    }

    return null;
  } catch (e) {
    logger.error(`Error loading app: ${id}`);
    throw new Error(`Error loading app: ${id}`);
  }
};

export const getUpdateInfo = async (id: string, version?: number) => {
  const doesFileExist = fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}`);

  if (!doesFileExist || !version) {
    return null;
  }

  const repoConfig: AppInfo = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`);

  return {
    current: version,
    latest: repoConfig.tipi_version,
    dockerVersion: repoConfig.version,
  };
};

export const ensureAppFolder = (appName: string, cleanup = false) => {
  if (cleanup && fileExists(`/runtipi/apps/${appName}`)) {
    deleteFolder(`/runtipi/apps/${appName}`);
  }

  if (!fileExists(`/runtipi/apps/${appName}/docker-compose.yml`)) {
    if (fileExists(`/runtipi/apps/${appName}`)) {
      deleteFolder(`/runtipi/apps/${appName}`);
    }
    // Copy from apps repo
    fs.copySync(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appName}`, `/runtipi/apps/${appName}`);
  }
};
