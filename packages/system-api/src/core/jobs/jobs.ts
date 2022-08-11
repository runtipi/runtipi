import cron from 'node-cron';
import config from '../../config';
import logger from '../../config/logger/logger';
import { updateRepo } from '../../helpers/repo-helpers';

const startJobs = () => {
  logger.info('Starting cron jobs...');

  cron.schedule('0 * * * *', () => {
    logger.info('Cloning apps repo...');
    updateRepo(config.APPS_REPO_URL);
  });
};

export default startJobs;
