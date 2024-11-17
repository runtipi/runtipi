import path from 'node:path';
import { execAsync } from '@/common/helpers/exec-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { appInfoSchema } from './dto/app-info.dto';

@Injectable()
export class AppFilesManager {
  constructor(
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
  ) {}

  private getInstalledAppsFolder() {
    const { directories } = this.configuration.getConfig();

    return path.join(directories.dataDir, 'apps');
  }

  private getAppsRepoFolder() {
    const { directories, appsRepoId } = this.configuration.getConfig();
    return path.join(directories.dataDir, 'repos', appsRepoId, 'apps');
  }

  public getAppPaths(appId: string) {
    const { directories } = this.configuration.getConfig();

    return {
      appDataDir: path.join(directories.appDataDir, appId),
      appRepoDir: path.join(this.getAppsRepoFolder(), appId),
      appInstalledDir: path.join(this.getInstalledAppsFolder(), appId),
    };
  }

  /**
   * Get the app info from the app store
   * @param id - The app id
   */
  public async getAppInfoFromAppStore(id: string) {
    try {
      const { appRepoDir } = this.getAppPaths(id);

      if (await this.filesystem.pathExists(path.join(appRepoDir, 'config.json'))) {
        const configFile = await this.filesystem.readTextFile(path.join(appRepoDir, 'config.json'));
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile ?? ''));

        if (!parsedConfig.success) {
          this.logger.debug(`App ${id} config error:`);
          this.logger.debug(parsedConfig.error);
        }

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = (await this.filesystem.readTextFile(path.join(appRepoDir, 'metadata', 'description.md'))) ?? '';
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

      if (await this.filesystem.pathExists(path.join(appInstalledDir, 'config.json'))) {
        const configFile = await this.filesystem.readTextFile(path.join(appInstalledDir, 'config.json'));
        const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile ?? ''));

        if (!parsedConfig.success) {
          this.logger.debug(`App ${id} config error:`);
          this.logger.debug(parsedConfig.error);
        }

        if (parsedConfig.success && parsedConfig.data.available) {
          const description = (await this.filesystem.readTextFile(path.join(appInstalledDir, 'metadata', 'description.md'))) ?? '';
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
  public async getDockerComposeYaml(id: string) {
    const arch = this.configuration.get('architecture');
    const { appInstalledDir } = this.getAppPaths(id);
    let dockerComposePath = path.join(appInstalledDir, 'docker-compose.yml');

    if (arch === 'arm64' && (await this.filesystem.pathExists(path.join(appInstalledDir, 'docker-compose.arm64.yml')))) {
      dockerComposePath = path.join(appInstalledDir, 'docker-compose.arm64.yml');
    }

    let content = null;
    try {
      if (await this.filesystem.pathExists(dockerComposePath)) {
        content = await this.filesystem.readTextFile(dockerComposePath);
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.yml for installed app ${id}: ${error}`);
    }

    return { path: dockerComposePath, content };
  }

  /**
   * Get the docker-compose.json file content from the installed app
   * @param id - The app id
   * @returns The content of docker-compose.json as a string, or null if not found
   */
  public async getDockerComposeJson(id: string) {
    const { appInstalledDir } = this.getAppPaths(id);
    const dockerComposePath = path.join(appInstalledDir, 'docker-compose.json');

    let content = null;
    try {
      if (await this.filesystem.pathExists(dockerComposePath)) {
        content = await this.filesystem.readJsonFile(dockerComposePath);
      }
    } catch (error) {
      this.logger.error(`Error getting docker-compose.json for installed app ${id}: ${error}`);
    }

    return { path: dockerComposePath, content };
  }

  /**
  /**
   * Copy the app from the repo to the installed apps folder
   * @param id - The app id
   */
  public async copyAppFromRepoToInstalled(id: string) {
    const appsRepoId = this.configuration.get('appsRepoId');
    const { appRepoDir, appDataDir, appInstalledDir } = this.getAppPaths(id);

    if (!(await this.filesystem.pathExists(appRepoDir))) {
      this.logger.error(`App ${id} not found in repo ${appsRepoId}`);
      throw new Error(`App ${id} not found in repo ${appsRepoId}`);
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
    this.logger.info(`Copying app ${id} from repo ${appsRepoId}`);
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
    const appsRepoFolder = this.getAppsRepoFolder();
    const appsRepoId = this.configuration.get('appsRepoId');

    if (!(await this.filesystem.pathExists(appsRepoFolder))) {
      this.logger.error(`Apps repo ${appsRepoId} not found. Make sure your repo is configured correctly.`);
      return [];
    }

    const appsDir = await this.filesystem.listFiles(appsRepoFolder);
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

    await this.filesystem.writeTextFile(dockerComposePath, composeFile);
  }

  public async deleteAppFolder(appId: string) {
    const { appInstalledDir } = this.getAppPaths(appId);
    await this.filesystem.removeDirectory(appInstalledDir);
  }

  public async deleteAppDataDir(appId: string) {
    const { appDataDir } = this.getAppPaths(appId);
    await this.filesystem.removeDirectory(appDataDir);
  }

  public async createAppDataDir(appId: string) {
    const { appDataDir } = this.getAppPaths(appId);
    await this.filesystem.createDirectory(appDataDir);
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

  public async getAppEnv(appId: string) {
    const { appDataDir } = this.getAppPaths(appId);

    const envPath = path.join(appDataDir, 'app.env');

    let env = '';
    if (await this.filesystem.pathExists(envPath)) {
      env = (await this.filesystem.readTextFile(envPath)) ?? '';
    }

    return { path: envPath, content: env };
  }

  public async writeAppEnv(appId: string, env: string) {
    const { appDataDir } = this.getAppPaths(appId);

    const envPath = path.join(appDataDir, 'app.env');

    await this.filesystem.writeTextFile(envPath, env);
  }

  /**
   * Get the user env file content
   * @param appId - The app id
   */
  public async getUserEnv(appId: string) {
    const { directories } = this.configuration.getConfig();

    const userEnvFile = path.join(directories.dataDir, 'user-config', appId, 'app.env');
    let content = null;

    if (await this.filesystem.pathExists(userEnvFile)) {
      content = await this.filesystem.readTextFile(userEnvFile);
    }

    return { path: userEnvFile, content };
  }

  public async getUserComposeFile(appId: string) {
    const { directories } = this.configuration.getConfig();

    const userComposeFile = path.join(directories.dataDir, 'user-config', appId, 'docker-compose.yml');
    let content = null;

    if (await this.filesystem.pathExists(userComposeFile)) {
      content = await this.filesystem.readTextFile(userComposeFile);
    }

    return { path: userComposeFile, content };
  }

  public async writeUserComposeFile(appId: string, compose: string) {
    const { directories } = this.configuration.getConfig();

    const userComposePath = path.join(directories.dataDir, 'user-config', appId);
    const userComposeFile = path.join(userComposePath, 'docker-compose.yml');

    await this.filesystem.createDirectory(userComposePath);
    await this.filesystem.writeTextFile(userComposeFile, compose);
  }

  public async writeUserEnv(appId: string, env: string) {
    const { directories } = this.configuration.getConfig();

    const userEnvPath = path.join(directories.dataDir, 'user-config', appId);
    const userEnvFile = path.join(userEnvPath, 'app.env');

    await this.filesystem.createDirectory(userEnvPath);
    await this.filesystem.writeTextFile(userEnvFile, env);
  }
}
