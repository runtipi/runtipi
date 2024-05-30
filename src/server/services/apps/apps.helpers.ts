import { App } from '@/server/db/schema';
import { appInfoSchema, sanitizePath } from '@runtipi/shared';
import { pathExists } from '@runtipi/shared/node';
import { DATA_DIR } from '@/config/constants';
import path from 'path';
import { fileExists, readdirSync, readFile, readJsonFile } from '../../common/fs.helpers';
import { TipiConfig } from '../../core/TipiConfig';
import { Logger } from '../../core/Logger';
import { notEmpty } from '../../common/typescript.helpers';
import { SystemServiceClass } from '../system';
import crypto from 'crypto';

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
  const { architecture } = TipiConfig.getConfig();
  let appsRepoId = '';

  getAppRepository(appName).then((repoId) => {
    appsRepoId = repoId;
  });
  const configFile = readJsonFile(path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps', sanitizePath(appName), 'config.json'));
  const parsedConfig = appInfoSchema.safeParse(configFile);

  if (!parsedConfig.success) {
    throw new Error(`App ${appName} has invalid config.json file`);
  }

  if (parsedConfig.data.supported_architectures && !parsedConfig.data.supported_architectures.includes(architecture)) {
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
  const systemService = new SystemServiceClass();
  const repositories = (await systemService.getAppStores()).appstores;
  // too bad
  // eslint-disable-next-line
  let finalApps: Array<any> = []; // TODO: fix that someday

  for (const repository of repositories) {
    const hash = crypto.createHash('sha256');
    hash.update(repository);
    const appsRepoId = hash.digest('hex');

    if (!(await pathExists(path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps')))) {
      Logger.error(`Apps repo ${appsRepoId} not found. Make sure your repo is configured correctly.`);
    } else {
      const appsDir = readdirSync(path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps'));

      const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json', '.DS_Store'];

      const apps = appsDir
        .map((app) => {
          if (skippedFiles.includes(app)) return null;

          const repoPath = path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps', sanitizePath(app));
          const configFile = readJsonFile(path.join(repoPath, 'config.json'));
          const parsedConfig = appInfoSchema.safeParse(configFile);

          if (!parsedConfig.success) {
            Logger.error(`App ${JSON.stringify(app)} has invalid config.json`);
            Logger.error(JSON.stringify(parsedConfig.error, null, 2));
          } else if (parsedConfig.data.available) {
            const description = readFile(path.join(repoPath, 'metadata', 'description.md'));
            return { ...parsedConfig.data, description };
          }

          return null;
        })
        .filter(notEmpty)
        .map(({ id, categories, name, short_desc, deprecated, supported_architectures }) => ({
          id,
          categories,
          name,
          short_desc,
          deprecated,
          supported_architectures,
        }));

      finalApps = finalApps.concat(apps);
    }
  }
  return finalApps;
};

/**
 * Given an appId it returns in which repository the app is located. The function goes through all the repos configured
 * in appstore.json
 * @param {string} appId - The app id to get the repo
 */
export const getAppRepository = async (appId: string) => {
  const systemService = new SystemServiceClass();
  const repositories = (await systemService.getAppStores()).appstores;

  for (const repository of repositories) {
    const hash = crypto.createHash('sha256');
    hash.update(repository);
    const appsRepoId = hash.digest('hex');

    if (await pathExists(path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps', appId))) {
      return repository;
    }
  }

  return '';
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
  let appsRepoId = '';
  getAppRepository(id).then((repoId) => {
    appsRepoId = repoId;
  });
  const repoConfig = readJsonFile(path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps', sanitizePath(id), 'config.json'));
  const parsedConfig = appInfoSchema.safeParse(repoConfig);

  if (parsedConfig.success) {
    return {
      latestVersion: parsedConfig.data.tipi_version,
      minTipiVersion: parsedConfig.data.min_tipi_version,
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
    let appsRepoId = '';

    // Check if app is installed
    const installed = typeof status !== 'undefined' && status !== 'missing';

    const appsFolder = path.join(DATA_DIR, 'apps', sanitizePath(id));

    if (installed && fileExists(path.join(appsFolder, 'config.json'))) {
      const configFile = readJsonFile(path.join(appsFolder, 'config.json'));
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (parsedConfig.success && parsedConfig.data.available) {
        const description = readFile(path.join(appsFolder, 'metadata', 'description.md'));
        return { ...parsedConfig.data, description };
      }
    }

    getAppRepository(id).then((repoId) => {
      appsRepoId = repoId;
    });

    const repoFolder = path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps', sanitizePath(id));

    if (fileExists(path.join(repoFolder, 'config.json'))) {
      const configFile = readJsonFile(path.join(repoFolder, 'config.json'));
      const parsedConfig = appInfoSchema.safeParse(configFile);

      if (parsedConfig.success && parsedConfig.data.available) {
        const description = readFile(path.join(repoFolder, 'metadata', 'description.md'));
        return { ...parsedConfig.data, description };
      }
    }

    return null;
  } catch (e) {
    Logger.error(`Error loading app: ${id}`);
    throw new Error(`Error loading app: ${id}`);
  }
};
