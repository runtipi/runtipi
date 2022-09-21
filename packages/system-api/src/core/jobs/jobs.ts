import cron from 'node-cron';
import logger from '../../config/logger/logger';
import { updateRepo } from '../../helpers/repo-helpers';
import { getConfig } from '../../core/config/TipiConfig';

const startJobs = () => {
  logger.info('Starting cron jobs...');

  cron.schedule('0 * * * *', () => {
    logger.info('Cloning apps repo...');
    updateRepo(getConfig().appsRepoUrl);
  });
};

export default startJobs;
