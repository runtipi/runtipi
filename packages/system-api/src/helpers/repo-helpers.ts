import Logger from '../config/logger/logger';
import { runScript } from '../modules/fs/fs.helpers';

export const updateRepo = (repo: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/runtipi/scripts/git.sh', ['update', repo], (err: string, stdout: string) => {
      if (err) {
        Logger.error(`Error updating repo: ${err}`);
        reject(err);
      }

      Logger.info(`Update result: ${stdout}`);

      resolve();
    });
  });
};

export const cloneRepo = (repo: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    runScript('/runtipi/scripts/git.sh', ['clone', repo], (err: string, stdout: string) => {
      if (err) {
        Logger.error(`Error cloning repo: ${err}`);
        reject(err);
      }

      Logger.info(`Clone result ${stdout}`);

      resolve();
    });
  });
};
