import { getEnv } from 'src/utils/environment/environment';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { pathExists } from '@/utils/fs-helpers';
import { getRepoHash } from './repo.helpers';
import { fileLogger } from '@/utils/logger/file-logger';

const execAsync = promisify(exec);

export class RepoExecutors {
  private readonly rootFolderHost: string;

  private readonly logger;

  constructor() {
    const { rootFolderHost } = getEnv();
    this.rootFolderHost = rootFolderHost;
    this.logger = fileLogger;
  }

  /**
   * Error handler for repo operations
   * @param {unknown} err
   */
  private handleRepoError = (err: unknown) => {
    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

    return { success: false, message: `An error occurred: ${err}` };
  };

  /**
   * Given a repo url, clone it to the repos folder if it doesn't exist
   *
   * @param {string} repoUrl
   */
  public cloneRepo = async (repoUrl: string) => {
    try {
      const repoHash = getRepoHash(repoUrl);
      const repoPath = path.join(this.rootFolderHost, 'repos', repoHash);

      if (await pathExists(repoPath)) {
        this.logger.info(`Repo ${repoUrl} already exists`);
        return { success: true, message: '' };
      }

      this.logger.info(`Cloning repo ${repoUrl} to ${repoPath}`);

      const { stdout, stderr } = await execAsync(`git clone ${repoUrl} ${repoPath}`);

      if (stderr) {
        this.logger.error(`Error cloning repo ${repoUrl}: ${stderr}`);
        return { success: false, message: stderr };
      }

      this.logger.info(`Cloned repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: stdout };
    } catch (err) {
      return this.handleRepoError(err);
    }
  };

  /**
   * Given a repo url, pull it to the repos folder if it exists
   *
   * @param {string} repoUrl
   */
  public pullRepo = async (repoUrl: string) => {
    try {
      const repoHash = getRepoHash(repoUrl);
      const repoPath = path.join(this.rootFolderHost, 'repos', repoHash);

      if (!(await pathExists(repoPath))) {
        this.logger.info(`Repo ${repoUrl} does not exist`);
        return { success: false, message: `Repo ${repoUrl} does not exist` };
      }

      this.logger.info(`Pulling repo ${repoUrl} to ${repoPath}`);

      const { stdout, stderr } = await execAsync(`git -C ${repoPath} pull`);

      if (stderr) {
        this.logger.error(`Error pulling repo ${repoUrl}: ${stderr}`);
        return { success: false, message: stderr };
      }

      this.logger.info(`Pulled repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: stdout };
    } catch (err) {
      return this.handleRepoError(err);
    }
  };
}
