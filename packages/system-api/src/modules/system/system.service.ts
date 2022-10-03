import axios from 'axios';
import z from 'zod';
import semver from 'semver';
import logger from '../../config/logger/logger';
import TipiCache from '../../config/TipiCache';
import { getConfig, setConfig } from '../../core/config/TipiConfig';
import { readJsonFile } from '../fs/fs.helpers';
import EventDispatcher, { EventTypes } from '../../core/config/EventDispatcher';

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

const systemInfo = (): z.infer<typeof systemInfoSchema> => {
  const info = systemInfoSchema.safeParse(readJsonFile('/runtipi/state/system-info.json'));

  if (!info.success) {
    logger.error('Error parsing system info');
    logger.error(info.error);
    throw new Error('Error parsing system info');
  } else {
    return info.data;
  }
};

const getVersion = async (): Promise<{ current: string; latest?: string }> => {
  try {
    let version = TipiCache.get<string>('latestVersion');

    if (!version) {
      const { data } = await axios.get('https://api.github.com/repos/meienberger/runtipi/releases/latest');

      TipiCache.set('latestVersion', data.name);
      version = data.name.replace('v', '');
    }

    TipiCache.set('latestVersion', version?.replace('v', ''));

    return { current: getConfig().version, latest: version?.replace('v', '') };
  } catch (e) {
    logger.error(e);
    return { current: getConfig().version, latest: undefined };
  }
};

const restart = async (): Promise<boolean> => {
  setConfig('status', 'RESTARTING');

  const { success } = await EventDispatcher.dispatchEventAsync(EventTypes.RESTART);

  if (!success) {
    logger.error('Error restarting system');
    return false;
  }

  setConfig('status', 'RUNNING');

  return true;
};

const update = async (): Promise<boolean> => {
  const { current, latest } = await getVersion();

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

  const { success } = await EventDispatcher.dispatchEventAsync(EventTypes.UPDATE);

  if (!success) {
    logger.error('Error updating system');
    return false;
  }

  setConfig('status', 'RUNNING');

  return true;
};

const SystemService = {
  systemInfo,
  getVersion,
  restart,
  update,
};

export default SystemService;
