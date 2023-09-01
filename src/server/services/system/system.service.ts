import semver from 'semver';
import { z } from 'zod';
import axios from 'redaxios';
import { TranslatedError } from '@/server/utils/errors';
import { readJsonFile } from '../../common/fs.helpers';
import { EventDispatcher } from '../../core/EventDispatcher';
import { Logger } from '../../core/Logger';
import { TipiCache } from '../../core/TipiCache';
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
  private cache;

  private dispatcher;

  constructor() {
    this.cache = new TipiCache();
    this.dispatcher = EventDispatcher;
  }

  /**
   * Get the current and latest version of Tipi
   *
   * @returns {Promise<{ current: string; latest: string }>} The current and latest version
   */
  public getVersion = async () => {
    try {
      const { seePreReleaseVersions } = TipiConfig.getConfig();

      if (seePreReleaseVersions) {
        const { data } = await axios.get<{ tag_name: string; body: string }[]>('https://api.github.com/repos/meienberger/runtipi/releases');

        return { current: TipiConfig.getConfig().version, latest: data[0]?.tag_name, body: data[0]?.body };
      }

      let version = await this.cache.get('latestVersion');
      let body = await this.cache.get('latestVersionBody');

      if (!version) {
        const { data } = await axios.get<{ tag_name: string; body: string }>('https://api.github.com/repos/meienberger/runtipi/releases/latest');

        version = data.tag_name;
        body = data.body;

        await this.cache.set('latestVersion', version || '', 60 * 60);
        await this.cache.set('latestVersionBody', body || '', 60 * 60);
      }

      return { current: TipiConfig.getConfig().version, latest: version, body };
    } catch (e) {
      Logger.error(e);
      return { current: TipiConfig.getConfig().version, latest: undefined };
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

  public update = async (): Promise<boolean> => {
    const { current, latest } = await this.getVersion();

    if (TipiConfig.getConfig().NODE_ENV === 'development') {
      throw new TranslatedError('server-messages.errors.not-allowed-in-dev');
    }

    if (!latest) {
      throw new TranslatedError('server-messages.errors.could-not-get-latest-version');
    }

    if (semver.gt(current, latest)) {
      throw new TranslatedError('server-messages.errors.current-version-is-latest');
    }

    if (semver.eq(current, latest)) {
      throw new TranslatedError('server-messages.errors.current-version-is-latest');
    }

    if (semver.major(current) !== semver.major(latest)) {
      throw new TranslatedError('server-messages.errors.major-version-update');
    }

    TipiConfig.setConfig('status', 'UPDATING');

    this.dispatcher.dispatchEvent({ type: 'system', command: 'update', version: latest });

    return true;
  };

  public restart = async (): Promise<boolean> => {
    if (TipiConfig.getConfig().NODE_ENV === 'development') {
      throw new TranslatedError('server-messages.errors.not-allowed-in-dev');
    }

    if (TipiConfig.getConfig().demoMode) {
      throw new TranslatedError('server-messages.errors.not-allowed-in-demo');
    }

    TipiConfig.setConfig('status', 'RESTARTING');
    this.dispatcher.dispatchEvent({ type: 'system', command: 'restart' });

    return true;
  };

  public static status = async (): Promise<{ status: SystemStatus }> => ({
    status: TipiConfig.getConfig().status,
  });
}
