import cron from 'node-cron';
import logger from '../../config/logger/logger';
import { getConfig } from '../../core/config/TipiConfig';
import EventDispatcher, { EventTypes } from '../config/EventDispatcher';

const startJobs = () => {
  logger.info('Starting cron jobs...');

  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    EventDispatcher.dispatchEvent(EventTypes.UPDATE_REPO, [getConfig().appsRepoUrl]);
  });

  // every minute
  cron.schedule('* * * * *', () => {
    EventDispatcher.dispatchEvent(EventTypes.SYSTEM_INFO, []);
  });
};

export default startJobs;
