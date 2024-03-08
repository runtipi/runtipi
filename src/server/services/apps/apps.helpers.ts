import { App } from '@/server/db/schema';
import { appInfoSchema } from '@runtipi/shared';
import { pathExists } from '@runtipi/shared/node';
import { DATA_DIR } from '../../../config';
import { fileExists, readdirSync, readFile, readJsonFile } from '../../common/fs.helpers';
import { TipiConfig } from '../../core/TipiConfig';
import { Logger } from '../../core/Logger';
import { notEmpty } from '../../common/typescript.helpers';

/**
 *  This function checks the requirements for the app with the provided name.
 *  It reads the config.json file for the app, parses it,
 *  and checks if the architecture of the current system is supported by the app.
 *  If the config.json file is invalid, it throws an error.
 *  If the architecture is not supported, it throws an error.
 *
 *  @param {string} appName - The name of the app.
 *  @throws Will throw an error if the app has an invalid config.json file or if the current system architecture is not supported by the app.
 */
export const checkAppRequirements = (appName: string) => {
  const configFile = readJsonFile(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps/${appName}/config.json`);
  const parsedConfig = appInfoSchema.safeParse(configFile);

  if (!parsedConfig.success) {
    throw new Error(`App ${appName} has invalid config.json file`);
  }

  if (parsedConfig.data.supported_architectures && !parsedConfig.data.supported_architectures.includes(TipiConfig.getConfig().architecture)) {
    throw new Error(`App ${appName} is not supported on this architecture`);
  }

  return parsedConfig.data;
};

/**
  This function reads the apps directory and skips certain system files, then reads the config.json and metadata/description.md files for each app,
  parses the config file, filters out any apps that are not available and returns an array of app information.
  If the config.json file is invalid, it logs an error message.
 */
export const getAvailableApps = async () => {
  if (!(await pathExists(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps`))) {
    Logger.error(`Apps repo ${TipiConfig.getConfig().appsRepoId} not found. Make sure your repo is configured correctly.`);
    return [];
  }

  const appsDir = readdirSync(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps`);

  const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json', '.DS_Store'];

  const apps = appsDir
    .map((app) => {
      if (skippedFiles.includes(app)) return null;

      const configFile = readJsonFile(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps/${app}/config.json`);
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (!parsedConfig.success) {
        Logger.error(`App ${JSON.stringify(app)} has invalid config.json`);
        Logger.error(JSON.stringify(parsedConfig.error, null, 2));
      } else if (parsedConfig.data.available) {
        const description = readFile(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps/${parsedConfig.data.id}/metadata/description.md`);
        return { ...parsedConfig.data, description };
      }

      return null;
    })
    .filter(notEmpty);

  return apps;
};

/**
 *  This function returns an object containing information about the updates available for the app with the provided id.
 *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
 *  If the config.json file is invalid, it returns null.
 *  If the app is not found, it returns null.
 *
 *  @param {string} id - The app id.
 */
export const getUpdateInfo = (id: string) => {
  const repoConfig = readJsonFile(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps/${id}/config.json`);
  const parsedConfig = appInfoSchema.safeParse(repoConfig);

  if (parsedConfig.success) {
    return {
      latestVersion: parsedConfig.data.tipi_version,
      latestDockerVersion: parsedConfig.data.version,
    };
  }

  return { latestVersion: 0, latestDockerVersion: '0.0.0' };
};

/**
 *  This function reads the config.json and metadata/description.md files for the app with the provided id,
 *  parses the config file and returns an object with app information.
 *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
 *  If the config.json file is invalid, it returns null.
 *  If an error occurs during the process, it logs the error message and throws an error.
 *
 *  @param {string} id - The app id.
 *  @param {App['status']} [status] - The app status.
 */
export const getAppInfo = (id: string, status?: App['status']) => {
  try {
    // Check if app is installed
    const installed = typeof status !== 'undefined' && status !== 'missing';

    if (installed && fileExists(`${DATA_DIR}/apps/${id}/config.json`)) {
      const configFile = readJsonFile(`${DATA_DIR}/apps/${id}/config.json`);
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (parsedConfig.success && parsedConfig.data.available) {
        const description = readFile(`${DATA_DIR}/apps/${id}/metadata/description.md`);
        return { ...parsedConfig.data, description };
      }
    }

    if (fileExists(`/data/repos/${TipiConfig.getConfig().appsRepoId}/apps/${id}/config.json`)) {
      const configFile = readJsonFile(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps/${id}/config.json`);
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (parsedConfig.success && parsedConfig.data.available) {
        const description = readFile(`${DATA_DIR}/repos/${TipiConfig.getConfig().appsRepoId}/apps/${id}/metadata/description.md`);
        return { ...parsedConfig.data, description };
      }
    }

    return null;
  } catch (e) {
    Logger.error(`Error loading app: ${id}`);
    throw new Error(`Error loading app: ${id}`);
  }
};
