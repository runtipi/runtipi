import { promises } from 'fs';
import axios from 'redaxios';
import { TipiCache } from '@/server/core/TipiCache';
import { fileExists } from '../../common/fs.helpers';
import { Logger } from '../../core/Logger';
import { TipiConfig } from '../../core/TipiConfig';

export class SystemServiceClass {
  /**
   * Get the current and latest version of Tipi
   *
   * @returns {Promise<{ current: string; latest: string }>} The current and latest version
   */
  public getVersion = async () => {
    const cache = new TipiCache('getVersion');
    try {
      const { seePreReleaseVersions, version: currentVersion } = TipiConfig.getConfig();

      if (seePreReleaseVersions) {
        const { data } = await axios.get<{ tag_name: string; body: string }[]>('https://api.github.com/repos/runtipi/runtipi/releases');

        return { current: currentVersion, latest: data[0]?.tag_name ?? currentVersion, body: data[0]?.body };
      }

      let version = await cache.get('latestVersion');
      let body = await cache.get('latestVersionBody');

      if (!version) {
        const { data } = await axios.get<{ tag_name: string; body: string }>('https://api.github.com/repos/runtipi/runtipi/releases/latest');

        version = data.tag_name;
        body = data.body;

        await cache.set('latestVersion', version || '', 60 * 60);
        await cache.set('latestVersionBody', body || '', 60 * 60);
      }

      return { current: TipiConfig.getConfig().version, latest: version, body };
    } catch (e) {
      Logger.error(e);
      return { current: TipiConfig.getConfig().version, latest: TipiConfig.getConfig().version, body: '' };
    } finally {
      await cache.close();
    }
  };

  public static hasSeenWelcome = async () => {
    return fileExists(`/runtipi/state/seen-welcome`);
  };

  public static markSeenWelcome = async () => {
    // Create file state/seen-welcome
    await promises.writeFile(`/runtipi/state/seen-welcome`, '');
    return true;
  };
}
