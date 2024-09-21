import path from 'node:path';
import fs from 'node:fs';
import { sanitizePath } from '../../../helpers/sanitizers';
import { appInfoSchema } from '../../../schemas/app-schemas';
import { pathExists } from '../../helpers/fs-helpers';
import { execAsync } from '../../helpers/exec-async';
import type { ILogger } from '../../logger/Logger.interface';

export interface IAppFileAccessor {
  getAppInfoFromAppStore: AppFileAccessor['getAppInfoFromAppStore'];
  getInstalledAppInfo: AppFileAccessor['getInstalledAppInfo'];
  getInstalledAppDockerComposeYaml: AppFileAccessor['getInstalledAppDockerComposeYaml'];
  getInstalledAppDockerComposeJson: AppFileAccessor['getInstalledAppDockerComposeJson'];
  copyAppFromRepoToInstalled: AppFileAccessor['copyAppFromRepoToInstalled'];
  getAppUpdateInfo: AppFileAccessor['getAppUpdateInfo'];
  getAvailableAppIds: AppFileAccessor['getAvailableAppIds'];
  writeDockerComposeYml: AppFileAccessor['writeDockerComposeYml'];
  setAppDataDirPermissions: AppFileAccessor['setAppDataDirPermissions'];
  copyDataDir: AppFileAccessor['copyDataDir'];
  deleteAppFolder: AppFileAccessor['deleteAppFolder'];
  deleteAppDataDir: AppFileAccessor['deleteAppDataDir'];
}

// Lower level data access class for apps
export class AppFileAccessor {
  private dataDir: string;
  private appsRepoId: string;
  private logger: ILogger;
  private appDataDir: string;

  constructor(params: { dataDir: string; appDataDir: string; appsRepoId: string; logger: ILogger }) {
    this.dataDir = params.dataDir;
    this.appsRepoId = params.appsRepoId;
    this.appDataDir = params.appDataDir;
    this.logger = params.logger;
  }

  private getInstalledAppsFolder() {
    return path.join(this.dataDir, 'apps');
  }

  private getAppsRepoFolder() {
    return path.join(this.dataDir, 'repos', sanitizePath(this.appsRepoId), 'apps');
  }

  private getAppPaths(appId: string) {
    return {
      appDataDir: path.join(this.appDataDir, sanitizePath(appId)),
      appRepoDir: path.join(this.getAppsRepoFolder(), sanitizePath(appId)),
      appInstalledDir: path.join(this.getInstalledAppsFolder(), sanitizePath(appId)),
    };
  }

  /**
   * Get the app info from the app store
   * @param id - The app id
   */
  public async getAppInfoFromAppStore(id: string) {
    try {
      const { appRepoDir } = this.getAppPaths(id);

      if (await pathExists(path.join(appRepoDir, 'config.json'))) {
        const configFile = await fs.promises.readFile(path.join(appRepoDir, 'config.json'), 'utf8');
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile));

        if (!parsedConfig.success) {
          this.logger.debug(`App ${id} config error:`);
          this.logger.debug(parsedConfig.error);
        }

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = await fs.promises.readFile(path.join(appRepoDir, 'metadata', 'description.md'), 'utf8');
          return { ...parsedConfig.data, description };
        }
      }
    } catch (error) {
      this.logger.error(`Error getting app info from app store for ${id}: ${error}`);
    }
  }

  /**
   * Get the app info from the installed apps apps
   * @param id - The app id
   */
  public async getInstalledAppInfo(id: string) {
    try {
      const { appInstalledDir } = this.getAppPaths(id);

      if (await pathExists(path.join(appInstalledDir, 'config.json'))) {
        const configFile = await fs.promises.readFile(path.join(appInstalledDir, 'config.json'), 'utf8');
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile));

        if (!parsedConfig.success) {
          this.logger.debug(`App ${id} config error:`);
          this.logger.debug(parsedConfig.error);
        }

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = await fs.promises.readFile(path.join(appInstalledDir, 'metadata', 'description.md'), 'utf8');
          return { ...parsedConfig.data, description };
        }
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the docker-compose.json file content from the installed app
   * @param id - The app id
   * @returns The content of docker-compose.yml as a string, or null if not found
   */
  public async getInstalledAppDockerComposeYaml(id: string) {
    try {
      const { appInstalledDir } = this.getAppPaths(id);
      const dockerComposePath = path.join(appInstalledDir, 'docker-compose.yml');

      if (await pathExists(dockerComposePath)) {
        return fs.promises.readFile(dockerComposePath, 'utf8') as Promise<string>;
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.yml for installed app ${id}: ${error}`);
    }
    return null;
  }

  /**
   * Get the docker-compose.json file content from the installed app
   * @param id - The app id
   * @returns The content of docker-compose.json as a string, or null if not found
   */
  public async getInstalledAppDockerComposeJson(id: string) {
    try {
      const { appInstalledDir } = this.getAppPaths(id);
      const dockerComposePath = path.join(appInstalledDir, 'docker-compose.json');
      if (await pathExists(dockerComposePath)) {
        return JSON.parse(await fs.promises.readFile(dockerComposePath, 'utf8'));
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.json for installed app ${id}: ${error}`);
      return null;
    }
    return null;
  }

  /**
  /**
   * Copy the app from the repo to the installed apps folder
   * @param id - The app id
   */
  public async copyAppFromRepoToInstalled(id: string) {
    const { appRepoDir, appDataDir, appInstalledDir } = this.getAppPaths(id);

    if (!(await pathExists(appRepoDir))) {
      this.logger.error(`App ${id} not found in repo ${this.appsRepoId}`);
      throw new Error(`App ${id} not found in repo ${this.appsRepoId}`);
    }

    // delete eventual app folder if exists
    this.logger.info(`Deleting app ${id} folder if exists`);
    await fs.promises.rm(appInstalledDir, { recursive: true, force: true });

    // Create app folder
    this.logger.info(`Creating app ${id} folder`);
    await fs.promises.mkdir(appInstalledDir, { recursive: true });

    // Create app data folder
    this.logger.info(`Creating app ${id} data folder`);
    await fs.promises.mkdir(appDataDir, { recursive: true });

    // Copy app folder from repo
    this.logger.info(`Copying app ${id} from repo ${this.appsRepoId}`);
    await fs.promises.cp(appRepoDir, appInstalledDir, { recursive: true });
  }

  /**
   *  This function returns an object containing information about the updates available for the app with the provided id.
   *  It checks if the app is installed or not and looks for the config.json file in the appropriate directory.
   *  If the config.json file is invalid, it returns null.
   *  If the app is not found, it returns null.
   *
   *  @param {string} id - The app id.
   */
  public async getAppUpdateInfo(id: string) {
    const config = await this.getAppInfoFromAppStore(id);

    if (config) {
      return {
        latestVersion: config.tipi_version,
        minTipiVersion: config.min_tipi_version,
        latestDockerVersion: config.version,
      };
    }

    return { latestVersion: 0, latestDockerVersion: '0.0.0' };
  }

  /**
   * Get the list of available app ids
   * @returns The list of app ids
   */
  public async getAvailableAppIds() {
    const appsRepoFolder = this.getAppsRepoFolder();

    if (!(await pathExists(appsRepoFolder))) {
      this.logger.error(`Apps repo ${this.appsRepoId} not found. Make sure your repo is configured correctly.`);
      return [];
    }

    const appsDir = await fs.promises.readdir(appsRepoFolder);
    const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json', '.DS_Store'];

    return appsDir.filter((app) => !skippedFiles.includes(app));
  }

  /**
   * Write the docker-compose.yml file to the installed app folder
   * @param appId - The app id
   * @param composeFile - The content of the docker-compose.yml file
   */
  public async writeDockerComposeYml(appId: string, composeFile: string) {
    const { appInstalledDir } = this.getAppPaths(appId);
    const dockerComposePath = path.join(appInstalledDir, 'docker-compose.yml');

    await fs.promises.writeFile(dockerComposePath, composeFile);
  }

  public async deleteAppFolder(appId: string) {
    const { appInstalledDir } = this.getAppPaths(appId);
    await fs.promises.rm(appInstalledDir, { recursive: true, force: true }).catch((err) => {
      this.logger.error(`Error deleting folder ${appInstalledDir}: ${JSON.stringify(err)}`);
    });
  }

  public async deleteAppDataDir(appId: string) {
    const { appDataDir } = this.getAppPaths(appId);
    await fs.promises.rm(appDataDir, { recursive: true, force: true }).catch((err) => {
      this.logger.error(`Error deleting folder ${appDataDir}: ${JSON.stringify(err)}`);
    });
  }

  /**
   * Set the permissions for the app data directory
   * @param appId - The app id
   */
  public async setAppDataDirPermissions(appId: string) {
    const { appDataDir } = this.getAppPaths(appId);

    await execAsync(`chmod -Rf a+rwx ${appDataDir}`).catch(() => {
      this.logger.error(`Error setting permissions for app ${appId}`);
    });
  }

  /**
   * Given a template and a map of variables, this function replaces all instances of the variables in the template with their values.
   *
   * @param {string} template - The template to be rendered.
   * @param {Map<string, string>} envMap - The map of variables and their values.
   */
  private renderTemplate(template: string, envMap: Map<string, string>) {
    let renderedTemplate = template;

    envMap.forEach((value, key) => {
      const safeKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      renderedTemplate = renderedTemplate.replace(new RegExp(`{{${safeKey}}}`, 'g'), value);
    });

    return renderedTemplate;
  }

  public async copyDataDir(appId: string, envMap: Map<string, string>) {
    const { appInstalledDir, appDataDir } = this.getAppPaths(appId);

    // return if app does not have a data directory
    if (!(await pathExists(path.join(appInstalledDir, 'data')))) {
      return;
    }

    // Return if app has already a data directory
    if (await pathExists(path.join(appDataDir, 'data'))) {
      return;
    }

    // Create app-data folder if it doesn't exist
    if (!(await pathExists(path.join(appDataDir, 'data')))) {
      await fs.promises.mkdir(path.join(appDataDir, 'data'), { recursive: true });
    }

    const dataDir = await fs.promises.readdir(path.join(appInstalledDir, 'data'));

    const processFile = async (file: string) => {
      if (file.endsWith('.template')) {
        const template = await fs.promises.readFile(path.join(appInstalledDir, 'data', file), 'utf-8');
        const renderedTemplate = this.renderTemplate(template, envMap);

        await fs.promises.writeFile(path.join(appDataDir, 'data', file.replace('.template', '')), renderedTemplate);
      } else {
        await fs.promises.copyFile(path.join(appInstalledDir, 'data', file), path.join(appDataDir, 'data', file));
      }
    };

    const processDir = async (p: string) => {
      await fs.promises.mkdir(path.join(appDataDir, 'data', p), {
        recursive: true,
      });

      const files = await fs.promises.readdir(path.join(appInstalledDir, 'data', p));

      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(appInstalledDir, 'data', p, file);

          if ((await fs.promises.lstat(fullPath)).isDirectory()) {
            await processDir(path.join(p, file));
          } else {
            await processFile(path.join(p, file));
          }
        }),
      );
    };

    await Promise.all(
      dataDir.map(async (file) => {
        const fullPath = path.join(appInstalledDir, 'data', file);

        if ((await fs.promises.lstat(fullPath)).isDirectory()) {
          await processDir(file);
        } else {
          await processFile(file);
        }
      }),
    );

    // Remove any .gitkeep files from the app-data folder at any level
    if (await pathExists(path.join(appDataDir, 'data'))) {
      await execAsync(`find ${appDataDir}/data -name .gitkeep -delete`).catch(() => {
        this.logger.error(`Error removing .gitkeep files from ${appDataDir}/data`);
      });
    }
  }
}
