import portUsed from 'tcp-port-used';
import { fileExists, getSeed, readdirSync, readFile, readJsonFile, runScript, writeFile } from '../fs/fs.helpers';
import InternalIp from 'internal-ip';
import crypto from 'crypto';
import config from '../../config';
import { AppInfo } from './apps.types';
import { getRepoId } from '../../helpers/repo-helpers';
import logger from '../../config/logger/logger';

export const checkAppRequirements = async (appName: string) => {
  let valid = true;
  const configFile: AppInfo = readJsonFile(`/apps/${appName}/config.json`);

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
  const configFile: AppInfo = readJsonFile(`/apps/${appName}/config.json`);
  const envMap = getEnvMap(appName);

  configFile.form_fields?.forEach((field) => {
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
  const repoId = await getRepoId(config.APPS_REPOSITORY);

  return new Promise((resolve, reject) => {
    runScript('/scripts/app.sh', [...params, config.ROOT_FOLDER_HOST, repoId], (err: string, stdout: string) => {
      if (err) {
        logger.error(err);
        reject(err);
      }

      logger.info(stdout);

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
  const configFile: AppInfo = readJsonFile(`/apps/${appName}/config.json`);
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

  const repoId = await getRepoId(config.APPS_REPOSITORY);
  const appsDir = readdirSync(`/repos/${repoId}/apps`);

  appsDir.forEach((app) => {
    if (fileExists(`/repos/${repoId}/apps/${app}/config.json`)) {
      const configFile: AppInfo = readJsonFile(`/apps/${app}/config.json`);

      if (configFile.available) {
        apps.push(app);
      }
    }
  });

  return apps;
};

export const getAppInfo = async (id: string): Promise<AppInfo> => {
  try {
    const repoId = await getRepoId(config.APPS_REPOSITORY);

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
