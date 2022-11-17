import crypto from 'crypto';
import fs from 'fs-extra';
import { z } from 'zod';
import { deleteFolder, fileExists, getSeed, readdirSync, readFile, readJsonFile, writeFile } from '../fs/fs.helpers';
import { AppCategoriesEnum, AppInfo, AppStatusEnum, AppSupportedArchitecturesEnum, FieldTypes } from './apps.types';
import logger from '../../config/logger/logger';
import { getConfig } from '../../core/config/TipiConfig';
import { AppEntityType } from './app.types';
import { notEmpty } from '../../helpers/helpers';

const formFieldSchema = z.object({
  type: z.nativeEnum(FieldTypes),
  label: z.string(),
  placeholder: z.string().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  hint: z.string().optional(),
  required: z.boolean().optional().default(false),
  env_variable: z.string(),
});

export const appInfoSchema = z.object({
  id: z.string(),
  available: z.boolean(),
  port: z.number().min(1).max(65535),
  name: z.string(),
  description: z.string().optional().default(''),
  version: z.string().optional().default('latest'),
  tipi_version: z.number(),
  short_desc: z.string(),
  author: z.string(),
  source: z.string(),
  website: z.string().optional(),
  categories: z.nativeEnum(AppCategoriesEnum).array(),
  url_suffix: z.string().optional(),
  form_fields: z.array(formFieldSchema).optional().default([]),
  https: z.boolean().optional().default(false),
  exposable: z.boolean().optional().default(false),
  no_gui: z.boolean().optional().default(false),
  supported_architectures: z.nativeEnum(AppSupportedArchitecturesEnum).array().optional(),
});

export const checkAppRequirements = (appName: string) => {
  const configFile = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appName}/config.json`);
  const parsedConfig = appInfoSchema.safeParse(configFile);

  if (!parsedConfig.success) {
    throw new Error(`App ${appName} has invalid config.json file`);
  }

  if (parsedConfig.data.supported_architectures && !parsedConfig.data.supported_architectures.includes(getConfig().architecture)) {
    throw new Error(`App ${appName} is not supported on this architecture`);
  }

  return parsedConfig.data;
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
  const configFile = readJsonFile(`/runtipi/apps/${appName}/config.json`);
  const parsedConfig = appInfoSchema.safeParse(configFile);

  if (!parsedConfig.success) {
    throw new Error(`App ${appName} has invalid config.json file`);
  }

  const envMap = getEnvMap(appName);

  parsedConfig.data.form_fields.forEach((field) => {
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
  const configFile = readJsonFile(`/runtipi/apps/${app.id}/config.json`);
  const parsedConfig = appInfoSchema.safeParse(configFile);

  if (!parsedConfig.success) {
    throw new Error(`App ${app.id} has invalid config.json file`);
  }

  const baseEnvFile = readFile('/runtipi/.env').toString();
  let envFile = `${baseEnvFile}\nAPP_PORT=${parsedConfig.data.port}\n`;
  const envMap = getEnvMap(app.id);

  parsedConfig.data.form_fields.forEach((field) => {
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
    envFile += `APP_DOMAIN=${getConfig().internalIp}:${parsedConfig.data.port}\n`;
  }

  // Create app-data folder if it doesn't exist
  if (!fs.existsSync(`/app/storage/app-data/${app.id}`)) {
    fs.mkdirSync(`/app/storage/app-data/${app.id}`, { recursive: true });
  }

  writeFile(`/app/storage/app-data/${app.id}/app.env`, envFile);
};

export const getAvailableApps = async (): Promise<AppInfo[]> => {
  const appsDir = readdirSync(`/runtipi/repos/${getConfig().appsRepoId}/apps`);

  const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json'];

  const apps = appsDir
    .map((app) => {
      if (skippedFiles.includes(app)) return null;

      const configFile = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${app}/config.json`);
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (!parsedConfig.success) {
        logger.error(`App ${JSON.stringify(app)} has invalid config.json`);
      } else if (parsedConfig.data.available) {
        const description = readFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${parsedConfig.data.id}/metadata/description.md`);
        return { ...parsedConfig.data, description };
      }

      return null;
    })
    .filter(notEmpty);

  return apps;
};

export const getAppInfo = (id: string, status?: AppStatusEnum): AppInfo | null => {
  try {
    // Check if app is installed
    const installed = typeof status !== 'undefined' && status !== AppStatusEnum.MISSING;

    if (installed && fileExists(`/runtipi/apps/${id}/config.json`)) {
      const configFile = readJsonFile(`/runtipi/apps/${id}/config.json`);
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (parsedConfig.success && parsedConfig.data.available) {
        const description = readFile(`/runtipi/apps/${id}/metadata/description.md`);
        return { ...parsedConfig.data, description };
      }
    }

    if (fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`)) {
      const configFile = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`);
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (parsedConfig.success && parsedConfig.data.available) {
        const description = readFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/metadata/description.md`);
        return { ...parsedConfig.data, description };
      }
    }

    return null;
  } catch (e) {
    logger.error(`Error loading app: ${id}`);
    throw new Error(`Error loading app: ${id}`);
  }
};

export const getUpdateInfo = async (id: string, version: number) => {
  const doesFileExist = fileExists(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}`);

  if (!doesFileExist) {
    return null;
  }

  const repoConfig = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${id}/config.json`);
  const parsedConfig = appInfoSchema.safeParse(repoConfig);

  if (parsedConfig.success) {
    return {
      current: version || 0,
      latest: parsedConfig.data.tipi_version,
      dockerVersion: parsedConfig.data.version,
    };
  }

  return null;
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
