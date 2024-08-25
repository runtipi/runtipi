import { promises } from 'node:fs';
import { DATA_DIR } from '@/config/constants';
import type { ICache } from '@runtipi/cache';
import { inject, injectable } from 'inversify';
import axios from 'redaxios';
import { fileExists } from '../../common/fs.helpers';
import { TipiConfig } from '../../core/TipiConfig';
import type { ILogger } from '@runtipi/shared/node';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import type { IAppCatalogCache } from '../app-catalog/app-catalog-cache';

export interface ISystemService {
  getVersion: () => Promise<{
    current: string;
    latest: string;
    body?: string | null;
  }>;
  updateRepos: () => Promise<boolean>;
}

@injectable()
export class SystemService implements ISystemService {
  constructor(
    @inject('ICache') private cache: ICache,
    @inject('ILogger') private logger: ILogger,
    @inject('IEventDispatcher') private eventDispatcher: IEventDispatcher,
    @inject('IAppCatalogCache') private appCatalogCache: IAppCatalogCache,
  ) {}
  /**
   * Get the current and latest version of Tipi
   *
   * @returns {Promise<{ current: string; latest: string }>} The current and latest version
   */
  public getVersion = async () => {
    try {
      const { seePreReleaseVersions, version: currentVersion } = TipiConfig.getConfig();

      if (seePreReleaseVersions) {
        const { data } = await axios.get<{ tag_name: string; body: string }[]>('https://api.github.com/repos/runtipi/runtipi/releases');

        return {
          current: currentVersion,
          latest: data[0]?.tag_name ?? currentVersion,
          body: data[0]?.body,
        };
      }

      let version = await this.cache.get('latestVersion');
      let body = await this.cache.get('latestVersionBody');

      if (!version) {
        const { data } = await axios.get<{ tag_name: string; body: string }>('https://api.github.com/repos/runtipi/runtipi/releases/latest');

        version = data.tag_name;
        body = data.body;

        await this.cache.set('latestVersion', version || '', 60 * 60);
        await this.cache.set('latestVersionBody', body || '', 60 * 60);
      }

      return { current: TipiConfig.getConfig().version, latest: version, body };
    } catch (e) {
      this.logger.error(e);
      return {
        current: TipiConfig.getConfig().version,
        latest: TipiConfig.getConfig().version,
        body: '',
      };
    }
  };

  public static hasSeenWelcome = async () => {
    return fileExists(`${DATA_DIR}/state/seen-welcome`);
  };

  public static markSeenWelcome = async () => {
    // Create file state/seen-welcome
    await promises.writeFile(`${DATA_DIR}/state/seen-welcome`, '');
    return true;
  };

  public updateRepos = async () => {
    const { appsRepoUrl } = TipiConfig.getConfig();
    await this.eventDispatcher.dispatchEventAsync({
      type: 'repo',
      command: 'clone',
      url: appsRepoUrl,
    });
    await this.eventDispatcher.dispatchEventAsync({
      type: 'repo',
      command: 'update',
      url: appsRepoUrl,
    });

    this.appCatalogCache.invalidateCache();

    return true;
  };
}
