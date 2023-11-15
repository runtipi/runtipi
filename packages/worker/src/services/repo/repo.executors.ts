import path from 'path';
import { execAsync, pathExists } from '@runtipi/shared';
import { getRepoHash } from './repo.helpers';
import { logger } from '@/lib/logger';

export class RepoExecutors {
  private readonly logger;

  constructor() {
    this.logger = logger;
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
      const repoPath = path.join('/app', 'repos', repoHash);

      if (await pathExists(repoPath)) {
        this.logger.info(`Repo ${repoUrl} already exists`);
        return { success: true, message: '' };
      }

      this.logger.info(`Cloning repo ${repoUrl} to ${repoPath}`);

      await execAsync(`git clone ${repoUrl} ${repoPath}`);

      this.logger.info(`Cloned repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: '' };
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
      const repoPath = path.join('/app', 'repos', repoHash);

      if (!(await pathExists(repoPath))) {
        this.logger.info(`Repo ${repoUrl} does not exist`);
        return { success: false, message: `Repo ${repoUrl} does not exist` };
      }

      this.logger.info(`Pulling repo ${repoUrl} to ${repoPath}`);

      this.logger.info(`Executing: git config --global --add safe.directory ${repoPath}`);
      await execAsync(`git config --global --add safe.directory ${repoPath}`).then(({ stderr }) => {
        if (stderr) {
          this.logger.error(`stderr: ${stderr}`);
        }
      });

      // git config pull.rebase false
      this.logger.info(`Executing: git -C ${repoPath} config pull.rebase false`);
      await execAsync(`git -C ${repoPath} config pull.rebase false`).then(({ stderr }) => {
        if (stderr) {
          this.logger.error(`stderr: ${stderr}`);
        }
      });

      this.logger.info(`Executing: git -C ${repoPath} rev-parse --abbrev-ref HEAD`);
      const currentBranch = await execAsync(`git -C ${repoPath} rev-parse --abbrev-ref HEAD`).then(({ stdout }) => {
        return stdout.trim();
      });

      this.logger.info(`Executing: git -C ${repoPath} fetch origin && git -C ${repoPath} reset --hard origin/${currentBranch}`);
      await execAsync(`git -C ${repoPath} fetch origin && git -C ${repoPath} reset --hard origin/${currentBranch}`).then(({ stderr }) => {
        if (stderr) {
          this.logger.error(`stderr: ${stderr}`);
        }
      });

      this.logger.info(`Pulled repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: '' };
    } catch (err) {
      return this.handleRepoError(err);
    }
  };
}
