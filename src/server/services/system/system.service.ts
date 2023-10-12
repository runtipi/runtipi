import { z } from 'zod';
import axios from 'redaxios';
import { TranslatedError } from '@/server/utils/errors';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { TipiCache } from '@/server/core/TipiCache';
import { readJsonFile } from '../../common/fs.helpers';
import { Logger } from '../../core/Logger';
import * as TipiConfig from '../../core/TipiConfig';

const SYSTEM_STATUS = ['UPDATING', 'RESTARTING', 'RUNNING'] as const;
type SystemStatus = (typeof SYSTEM_STATUS)[keyof typeof SYSTEM_STATUS];

const systemInfoSchema = z.object({
  cpu: z.object({
    load: z.number().default(0),
  }),
  disk: z.object({
    total: z.number().default(0),
    used: z.number().default(0),
    available: z.number().default(0),
  }),
  memory: z.object({
    total: z.number().default(0),
    available: z.number().default(0),
    used: z.number().default(0),
  }),
});

export class SystemServiceClass {
  /**
   * Get the current and latest version of Tipi
   *
   * @returns {Promise<{ current: string; latest: string }>} The current and latest version
   */
  public getVersion = async () => {
    const cache = new TipiCache('getVersion');
    try {
      const { seePreReleaseVersions } = TipiConfig.getConfig();
      const currentVersion = TipiConfig.getConfig().version;

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

  public static systemInfo = (): z.infer<typeof systemInfoSchema> => {
    const info = systemInfoSchema.safeParse(readJsonFile('/runtipi/state/system-info.json'));

    if (!info.success) {
      Logger.error('Error parsing system info', info.error);

      return { cpu: { load: 0 }, disk: { total: 0, used: 0, available: 0 }, memory: { total: 0, available: 0, used: 0 } };
    }

    return info.data;
  };

  public restart = async (): Promise<boolean> => {
    if (TipiConfig.getConfig().NODE_ENV === 'development') {
      throw new TranslatedError('server-messages.errors.not-allowed-in-dev');
    }

    if (TipiConfig.getConfig().demoMode) {
      throw new TranslatedError('server-messages.errors.not-allowed-in-demo');
    }

    TipiConfig.setConfig('status', 'RESTARTING');
    const dispatcher = new EventDispatcher('restart');
    dispatcher.dispatchEvent({ type: 'system', command: 'restart' });
    await dispatcher.close();

    return true;
  };

  public static status = async (): Promise<{ status: SystemStatus }> => ({
    status: TipiConfig.getConfig().status,
  });
}
