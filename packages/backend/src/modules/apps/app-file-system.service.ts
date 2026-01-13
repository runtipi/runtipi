import path from 'node:path';
import { execAsync } from '@/common/helpers/exec-helpers';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppPathsService } from './app-paths.service';

@Injectable()
export class AppFileSystemService {
  constructor(
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
    private readonly appPaths: AppPathsService,
  ) {}

  public async copyAppFromRepoToInstalled(appUrn: AppUrn) {
    const { appRepoDir, appInstalledDir } = this.appPaths.getAppPaths(appUrn);

    if (!(await this.filesystem.pathExists(appRepoDir))) {
      if (await this.filesystem.pathExists(appInstalledDir)) {
        this.logger.warn(`App ${appUrn} already installed, but not found in repo. Using installed version.`);
        return;
      }

      throw new Error(`App ${appUrn} not found in repo`);
    }

    // delete eventual app folder if exists
    this.logger.info(`Deleting app ${appUrn} folder if exists`);
    await this.filesystem.removeDirectory(appInstalledDir);

    // Create app folder
    this.logger.info(`Creating app ${appUrn} folder`);
    await this.filesystem.createDirectory(appInstalledDir);

    // Copy app folder from repo
    this.logger.info(`Copying app ${appUrn} from repo`);
    await this.filesystem.copyDirectory(appRepoDir, appInstalledDir);
  }

  public async prepareAppDataDir(appUrn: AppUrn, envMap: Map<string, string>) {
    const { appInstalledDir, appDataDir } = this.appPaths.getAppPaths(appUrn);

    // Return if app does not have a data directory in the installed folder
    if (!(await this.filesystem.pathExists(path.join(appInstalledDir, 'data')))) {
      return;
    }

    // Return if app already has a data directory in app-data
    if (await this.filesystem.pathExists(path.join(appDataDir, 'data'))) {
      return;
    }

    // Create app-data folder
    await this.filesystem.createDirectory(path.join(appDataDir, 'data'));

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

  private renderTemplate(template: string, envMap: Map<string, string>) {
    let renderedTemplate = template;

    envMap.forEach((value, key) => {
      const safeKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      renderedTemplate = renderedTemplate.replace(new RegExp(`{{${safeKey}}}`, 'g'), value);
    });

    return renderedTemplate;
  }
}
