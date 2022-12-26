import axios from 'axios';
import semver from 'semver';
import { z } from 'zod';
import { readJsonFile } from '../../common/fs.helpers';
import { EventDispatcher, EventTypes } from '../../core/EventDispatcher';
import { Logger } from '../../core/Logger';
import TipiCache from '../../core/TipiCache';
import { getConfig, setConfig } from '../../core/TipiConfig';
import { env } from '../../../env/server.mjs';
import { SystemStatus } from '../../../client/state/systemStore';

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

const status = async (): Promise<{ status: SystemStatus }> => ({
  status: getConfig().status as SystemStatus,
});

/**
 * Get the current and latest version of Tipi
 * @returns {Promise<{ current: string; latest: string }>}
 */
const getVersion = async (): Promise<{ current: string; latest?: string }> => {
  try {
    let version = await TipiCache.get('latestVersion');

    if (!version) {
      const { data } = await axios.get('https://api.github.com/repos/meienberger/runtipi/releases/latest');

      version = data.name.replace('v', '');
      await TipiCache.set('latestVersion', version?.replace('v', '') || '', 60 * 60);
    }

    return { current: getConfig().version, latest: version?.replace('v', '') };
  } catch (e) {
    Logger.error(e);
    return { current: getConfig().version, latest: undefined };
  }
};

const systemInfo = (): z.infer<typeof systemInfoSchema> => {
  const info = systemInfoSchema.safeParse(readJsonFile('/runtipi/state/system-info.json'));

  if (!info.success) {
    throw new Error('Error parsing system info');
  } else {
    return info.data;
  }
};

const restart = async (): Promise<boolean> => {
  if (env.NODE_ENV === 'development') {
    throw new Error('Cannot restart in development mode');
  }

  setConfig('status', 'RESTARTING');
  EventDispatcher.dispatchEventAsync(EventTypes.RESTART);

  return true;
};

const update = async (): Promise<boolean> => {
  const { current, latest } = await getVersion();

  if (env.NODE_ENV === 'development') {
    throw new Error('Cannot update in development mode');
  }

  if (!latest) {
    throw new Error('Could not get latest version');
  }

  if (semver.gt(current, latest)) {
    throw new Error('Current version is newer than latest version');
  }

  if (semver.eq(current, latest)) {
    throw new Error('Current version is already up to date');
  }

  if (semver.major(current) !== semver.major(latest)) {
    throw new Error('The major version has changed. Please update manually');
  }

  setConfig('status', 'UPDATING');

  EventDispatcher.dispatchEventAsync(EventTypes.UPDATE);

  return true;
};

export const SystemService = {
  getVersion,
  systemInfo,
  restart,
  update,
  status,
};
