import fs from 'fs';
import axios from 'redaxios';
import { tipiCache } from '@/server/core/TipiCache';
import { DATA_DIR } from '@/config/constants';
import { pathExists } from '@runtipi/shared/node';
import path from 'path';
import { Logger } from '../../core/Logger';
import { TipiConfig } from '../../core/TipiConfig';

export class SystemServiceClass {
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

        return { current: currentVersion, latest: data[0]?.tag_name ?? currentVersion, body: data[0]?.body };
      }

      let version = await tipiCache.get('latestVersion');
      let body = await tipiCache.get('latestVersionBody');

      if (!version) {
        const { data } = await axios.get<{ tag_name: string; body: string }>('https://api.github.com/repos/runtipi/runtipi/releases/latest');

        version = data.tag_name;
        body = data.body;

        await tipiCache.set('latestVersion', version || '', 60 * 60);
        await tipiCache.set('latestVersionBody', body || '', 60 * 60);
      }

      return { current: TipiConfig.getConfig().version, latest: version, body };
    } catch (e) {
      Logger.error(e);
      return { current: TipiConfig.getConfig().version, latest: TipiConfig.getConfig().version, body: '' };
    }
  };

  public static hasSeenWelcome = async () => {
    return pathExists(path.join(DATA_DIR, 'state', 'seen-welcome'));
  };

  public static markSeenWelcome = async () => {
    // Create file state/seen-welcome
    await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'seen-welcome'), '');
    return true;
  };
}
