import axios from 'redaxios';
import { TipiCache } from '@/server/core/TipiCache';
import { Logger } from '../../core/Logger';
import { getConfig } from '../../core/TipiConfig';

export class SystemServiceClass {
  /**
   * Get the current and latest version of Tipi
   *
   * @returns {Promise<{ current: string; latest: string }>} The current and latest version
   */
  public getVersion = async () => {
    const cache = new TipiCache('getVersion');
    try {
      const { seePreReleaseVersions, version: currentVersion } = getConfig();

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

      return { current: getConfig().version, latest: version, body };
    } catch (e) {
      Logger.error(e);
      return { current: getConfig().version, latest: getConfig().version, body: '' };
    } finally {
      await cache.close();
    }
  };
}
