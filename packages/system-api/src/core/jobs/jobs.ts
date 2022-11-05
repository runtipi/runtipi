import cron from 'node-cron';
import logger from '../../config/logger/logger';
import { getConfig } from '../config/TipiConfig';
import { eventDispatcher, EventTypes } from '../config/EventDispatcher';

const startJobs = () => {
  logger.info('Starting cron jobs...');

  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    eventDispatcher.dispatchEvent(EventTypes.UPDATE_REPO, [getConfig().appsRepoUrl]);
  });

  // every minute
  cron.schedule('* * * * *', () => {
    eventDispatcher.dispatchEvent(EventTypes.SYSTEM_INFO, []);
  });
};

export default startJobs;
