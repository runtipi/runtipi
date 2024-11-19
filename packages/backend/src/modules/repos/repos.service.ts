import crypto from 'node:crypto';
import path from 'node:path';
import { execAsync } from '@/common/helpers/exec-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { RepoEventsQueue } from '../queue/entities/repo-events';

@Injectable()
export class ReposService {
  constructor(
    private readonly logger: LoggerService,
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
    private readonly repoQueue: RepoEventsQueue,
  ) {
    this.repoQueue.onEvent(async ({ eventId, command, url }) => {
      switch (command) {
        case 'clone': {
          const { success, message } = await this.cloneRepo(url);
          this.repoQueue.sendEventResponse(eventId, { success, message });
          break;
        }
        case 'update': {
          const { success, message } = await this.pullRepo(url);
          this.repoQueue.sendEventResponse(eventId, { success, message });
          break;
        }
        default:
          this.logger.error(`Unknown command: ${command}`);
      }
    });
  }

  /**
   * Given a repo url, return a hash of it to be used as a folder name
   *
   * @param {string} repoUrl
   */
  public getRepoHash = (repoUrl: string) => {
    const hash = crypto.createHash('sha256');
    hash.update(repoUrl);
    return hash.digest('hex');
  };

  /**
   * Extracts the base URL and branch from a repository URL.
   * @param repoUrl The repository URL.
   * @returns An array containing the base URL and branch, or just the base URL if no branch is found.
   */
  private getRepoBaseUrlAndBranch = (repoUrl: string) => {
    const branchMatch = repoUrl.match(/^(.*)\/tree\/(.*)$/);
    if (branchMatch) {
      return [branchMatch[1], branchMatch[2]];
    }

    return [repoUrl, undefined];
  };

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
      const { dataDir } = this.configuration.get('directories');

      // We may have a potential branch computed in the hash (see getRepoBaseUrlAndBranch)
      // so we do it here before splitting the url into repoUrl and branch
      const repoHash = this.getRepoHash(url);
      const repoPath = path.join(dataDir, 'repos', repoHash);

      if (await this.filesystem.pathExists(repoPath)) {
        this.logger.info(`Repo ${url} already exists`);
        return { success: true, message: '' };
      }

      const [repoUrl, branch] = this.getRepoBaseUrlAndBranch(url);

      let cloneCommand: string;
      if (branch) {
        this.logger.info(`Cloning repo ${repoUrl} on branch ${branch} to ${repoPath}`);
        cloneCommand = `git clone -b ${branch} --depth 1 ${repoUrl} ${repoPath}`;
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
      const { dataDir } = this.configuration.get('directories');

      const repoHash = this.getRepoHash(repoUrl);
      const repoPath = path.join(dataDir, 'repos', repoHash);

      if (!(await this.filesystem.pathExists(repoPath))) {
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
      await execAsync(`git -C ${repoPath} fetch origin && git -C ${repoPath} reset --hard origin/${currentBranch}`);

      this.logger.info(`Pulled repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: '' };
    } catch (err) {
      return this.handleRepoError(err);
    }
  };
}
