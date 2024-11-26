import path from 'node:path';
import { execAsync } from '@/common/helpers/exec-helpers';
import type { ConfigurationService } from '@/core/config/configuration.service';
import type { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { appInfoSchema } from '../marketplace/dto/marketplace.dto';

export class AppStoreFilesManager {
  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private storeId: string,
  ) {}

  private getInstalledAppsFolder() {
    const { directories } = this.configuration.getConfig();

    return path.join(directories.dataDir, 'apps');
  }

  private getAppStoreFolder() {
    const { directories } = this.configuration.getConfig();
    return path.join(directories.dataDir, 'repos', this.storeId, 'apps');
  }

  public getAppPaths(namespacedId: string) {
    const [storeId, appId] = namespacedId.split('_');

    if (!storeId || !appId) {
      throw new Error(`Invalid namespaced app id: ${namespacedId}`);
    }

    const { directories } = this.configuration.getConfig();

    return {
      appDataDir: path.join(directories.appDataDir, storeId, appId),
      appRepoDir: path.join(this.getAppStoreFolder(), appId),
      appInstalledDir: path.join(this.getInstalledAppsFolder(), storeId, appId),
    };
  }

  /**
   * Get the app info from the app store
   * @param namespacedId - The app id
   */
  public async getAppInfoFromAppStore(namespacedId: string) {
    try {
      const { appRepoDir } = this.getAppPaths(namespacedId);

      if (await this.filesystem.pathExists(path.join(appRepoDir, 'config.json'))) {
        const configFile = await this.filesystem.readTextFile(path.join(appRepoDir, 'config.json'));
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile ?? ''));

        if (!parsedConfig.success) {
          this.logger.debug(`App ${namespacedId} config error:`);
          this.logger.debug(parsedConfig.error);
        }

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = (await this.filesystem.readTextFile(path.join(appRepoDir, 'metadata', 'description.md'))) ?? '';
          return { ...parsedConfig.data, id: namespacedId, description };
        }
      }
    } catch (error) {
      this.logger.error(`Error getting app info from app store for ${namespacedId}: ${error}`);
    }
  }

  /**
   * Copy the app from the repo to the installed apps folder
   * @param id - The app id
   */
  public async copyAppFromRepoToInstalled(id: string) {
    const { appRepoDir, appDataDir, appInstalledDir } = this.getAppPaths(id);

    if (!(await this.filesystem.pathExists(appRepoDir))) {
      this.logger.error(`App ${id} not found in repo ${this.storeId}`);
      throw new Error(`App ${id} not found in repo ${this.storeId}`);
    }

    // delete eventual app folder if exists
    this.logger.info(`Deleting app ${id} folder if exists`);
    await this.filesystem.removeDirectory(appInstalledDir);

    // Create app folder
    this.logger.info(`Creating app ${id} folder`);
    await this.filesystem.createDirectory(appInstalledDir);

    // Create app data folder
    this.logger.info(`Creating app ${id} data folder`);
    await this.filesystem.createDirectory(appDataDir);

    // Copy app folder from repo
    this.logger.info(`Copying app ${id} from repo ${this.storeId}`);
    await this.filesystem.copyDirectory(appRepoDir, appInstalledDir);
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
    const appsRepoFolder = this.getAppStoreFolder();

    if (!(await this.filesystem.pathExists(appsRepoFolder))) {
      this.logger.error(`Apps repo ${this.storeId} not found. Make sure your repo is configured correctly.`);
      return [];
    }

    const appsDir = await this.filesystem.listFiles(appsRepoFolder);
    const skippedFiles = ['__tests__', 'docker-compose.common.yml', 'schema.json', '.DS_Store'];

    return appsDir.filter((app) => !skippedFiles.includes(app)).map((app) => `${this.storeId}_${app}`);
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
    if (!(await this.filesystem.pathExists(path.join(appInstalledDir, 'data')))) {
      return;
    }

    // Return if app has already a data directory
    if (await this.filesystem.pathExists(path.join(appDataDir, 'data'))) {
      return;
    }

    // Create app-data folder if it doesn't exist
    if (!(await this.filesystem.pathExists(path.join(appDataDir, 'data')))) {
      await this.filesystem.createDirectory(path.join(appDataDir, 'data'));
    }

    const dataDir = await this.filesystem.listFiles(path.join(appInstalledDir, 'data'));

    const processFile = async (file: string) => {
      if (file.endsWith('.template')) {
        const template = await this.filesystem.readTextFile(path.join(appInstalledDir, 'data', file));
        if (template) {
          const renderedTemplate = this.renderTemplate(template, envMap);

          await this.filesystem.writeTextFile(path.join(appDataDir, 'data', file.replace('.template', '')), renderedTemplate);
        }
      } else {
        await this.filesystem.copyFile(path.join(appInstalledDir, 'data', file), path.join(appDataDir, 'data', file));
      }
    };

    const processDir = async (p: string) => {
      await this.filesystem.createDirectory(path.join(appDataDir, 'data', p));

      const files = await this.filesystem.listFiles(path.join(appInstalledDir, 'data', p));

      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(appInstalledDir, 'data', p, file);

          if (await this.filesystem.isDirectory(fullPath)) {
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

        if (await this.filesystem.isDirectory(fullPath)) {
          await processDir(file);
        } else {
          await processFile(file);
        }
      }),
    );

    // Remove any .gitkeep files from the app-data folder at any level
    if (await this.filesystem.pathExists(path.join(appDataDir, 'data'))) {
      await execAsync(`find ${appDataDir}/data -name .gitkeep -delete`).catch(() => {
        this.logger.error(`Error removing .gitkeep files from ${appDataDir}/data`);
      });
    }
  }

  public async getAppImage(appId: string) {
    const { appInstalledDir, appRepoDir } = this.getAppPaths(appId);
    const { appDir } = this.configuration.get('directories');

    const defaultFilePath = path.join(appInstalledDir, 'metadata', 'logo.jpg');
    const appRepoFilePath = path.join(appRepoDir, 'metadata', 'logo.jpg');

    let filePath = path.join(appDir, 'public', 'app-not-found.jpg');

    if (await this.filesystem.pathExists(defaultFilePath)) {
      filePath = defaultFilePath;
    } else if (await this.filesystem.pathExists(appRepoFilePath)) {
      filePath = appRepoFilePath;
    }

    const file = await this.filesystem.readBinaryFile(filePath);
    return file;
  }
}
