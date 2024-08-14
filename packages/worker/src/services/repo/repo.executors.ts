import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import { logger } from '@/lib/logger';
import { sanitizePath } from '@runtipi/shared';
import { execAsync, pathExists } from '@runtipi/shared/node';
import * as Sentry from '@sentry/node';
import { getRepoBaseUrlAndBranch, getRepoHash } from './repo.helpers';

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
    Sentry.captureException(err);

    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

    return { success: false, message: `An error occurred: ${String(err)}` };
  };

  /**
   * Given a repo url, clone it to the repos folder if it doesn't exist
   *
   * @param {string} url
   */
  public cloneRepo = async (url: string) => {
    try {
      // We may have a potential branch computed in the hash (see getRepoBaseUrlAndBranch)
      // so we do it here before splitting the url into repoUrl and branch
      const repoHash = getRepoHash(url);
      const repoPath = path.join(DATA_DIR, 'repos', sanitizePath(repoHash));

      if (await pathExists(repoPath)) {
        this.logger.info(`Repo ${url} already exists`);
        return { success: true, message: '' };
      }

      const [repoUrl, branch] = getRepoBaseUrlAndBranch(url);

      let cloneCommand: string;
      if (branch) {
        this.logger.info(`Cloning repo ${repoUrl} on branch ${branch} to ${repoPath}`);
        cloneCommand = `git clone --depth 1 -b ${branch} ${repoUrl} ${repoPath}`;
      } else {
        this.logger.info(`Cloning repo ${repoUrl} to ${repoPath}`);
        cloneCommand = `git clone --depth 1 ${repoUrl} ${repoPath}`;
      }

      await execAsync(cloneCommand);

      // Chmod the repo folder to 777
      this.logger.info(`Executing: chmod -R 755 ${repoPath}`);
      await execAsync(`chmod -R 755 ${repoPath}`);

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
      const repoPath = path.join(DATA_DIR, 'repos', sanitizePath(repoHash));

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
      const currentBranch = await execAsync(`git -C ${repoPath} rev-parse --abbrev-ref HEAD`).then(
        ({ stdout }) => {
          return stdout.trim();
        },
      );

      this.logger.info(
        `Executing: git -C ${repoPath} fetch origin && git -C ${repoPath} reset --hard origin/${currentBranch}`,
      );
      await execAsync(
        `git -C ${repoPath} fetch origin && git -C ${repoPath} reset --hard origin/${currentBranch}`,
      );

      this.logger.info(`Pulled repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: '' };
    } catch (err) {
      return this.handleRepoError(err);
    }
  };

  /**
   * Given an array of repository URLs it pulls them.
   *
   * @param {array} repoUrls
   */
  public pullRepos = async (repoUrls: string[]) => {
    try {
      for (const repo of repoUrls) {
        const { success, message } = await this.pullRepo(repo);
        if (!success) {
          return { success, message };
        }
      }
      return { success: true, message: '' };
    } catch (e) {
      return this.handleRepoError(e);
    }
  };

  /**
   * Given an array of repository URLs it clones them.
   *
   * @param {array} repoUrls
   */
  public cloneRepos = async (repoUrls: string[]) => {
    try {
      for (const repo of repoUrls) {
        const { success, message } = await this.cloneRepo(repo);
        if (!success) {
          return { success, message };
        }
      }
      return { success: true, message: '' };
    } catch (e) {
      return this.handleRepoError(e);
    }
  };
}
