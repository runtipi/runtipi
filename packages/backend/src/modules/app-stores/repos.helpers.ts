import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

@Injectable()
export class ReposHelpers {
  constructor(
    private readonly logger: LoggerService,
    private readonly configuration: ConfigurationService,
    private readonly filesystem: FilesystemService,
  ) {}

  /**
   * Given a repo url, return a hash of it to be used as a folder name
   *
   * @param {string} repoUrl
   */
  public getRepoHash(repoUrl: string) {
    const hash = crypto.createHash('sha256');
    hash.update(repoUrl);
    return hash.digest('hex');
  }

  /**
   * Extracts the base URL and branch from a repository URL.
   * @param repoUrl The repository URL.
   * @returns An array containing the base URL and branch, or just the base URL if no branch is found.
   */
  private getRepoBaseUrlAndBranch(repoUrl: string) {
    const treeIndex = repoUrl.indexOf('/tree/');

    if (treeIndex !== -1) {
      const baseUrl = repoUrl.substring(0, treeIndex);
      const branch = repoUrl.substring(treeIndex + '/tree/'.length);
      return [baseUrl, branch];
    }

    return [repoUrl, undefined];
  }

  /**
   * Error handler for repo operations
   * @param {unknown} err
   */
  private handleRepoError(err: unknown) {
    Sentry.captureException(err);

    if (err instanceof Error) {
      this.logger.error(`An error occurred: ${err.message}`);
      return { success: false, message: err.message };
    }

    return { success: false, message: `An error occurred: ${String(err)}` };
  }

  /**
   * Ensure directory exists and has correct permissions
   * @param {string} dirPath
   */
  private async ensureDirectoryWithPermissions(dirPath: string): Promise<void> {
    if (!(await this.filesystem.pathExists(dirPath))) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }

    // Set directory permissions
    await fs.promises.chmod(dirPath, 0o755);
  }

  /**
   * Given a repo url, clone it to the repos folder if it doesn't exist
   *
   * @param {string} url
   */
  public async cloneRepo(url: string, id: string) {
    try {
      const { dataDir } = this.configuration.get('directories');
      const repoPath = path.join(dataDir, 'repos', id);

      if (await this.filesystem.pathExists(repoPath)) {
        this.logger.debug(`Repo ${url} already exists`);
        return { success: true, message: '' };
      }

      const [repoUrl, branch] = this.getRepoBaseUrlAndBranch(url);

      if (!repoUrl) {
        this.logger.error(`Invalid repo URL: ${url}`);
        return { success: false, message: `Invalid repo URL: ${url}` };
      }

      this.logger.debug(`Cloning repo ${repoUrl}${branch ? ` on branch ${branch}` : ''} to ${repoPath}`);

      await this.ensureDirectoryWithPermissions(path.dirname(repoPath));
      await git.clone({ fs, http, dir: repoPath, url: repoUrl, singleBranch: true, depth: 1, ref: branch || undefined });
      await this.ensureDirectoryWithPermissions(repoPath);

      this.logger.info(`Cloned repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: '' };
    } catch (err) {
      return this.handleRepoError(err);
    }
  }

  /**
   * Given a repo url, pull it to the repos folder if it exists
   *
   * @param {string} repoUrl
   */
  public async pullRepo(repoUrl: string, slug: string) {
    try {
      await this.cloneRepo(repoUrl, slug);

      const { dataDir } = this.configuration.get('directories');
      const repoPath = path.join(dataDir, 'repos', slug);

      if (!(await this.filesystem.pathExists(repoPath))) {
        this.logger.info(`Repo ${repoUrl} does not exist`);
        return { success: false, message: `Repo ${repoUrl} does not exist` };
      }

      this.logger.debug(`Pulling repo ${repoUrl} to ${repoPath}`);

      const currentBranch = await git.currentBranch({ fs, dir: repoPath, fullname: false });
      if (!currentBranch) {
        this.logger.warn(`No current branch found for repo ${repoUrl}. Deleting and re-cloning.`);
        await this.deleteRepo(slug);
        return this.cloneRepo(repoUrl, slug);
      }
      const remoteBranchRef = `origin/${currentBranch}`;

      await git.fetch({ fs, http, dir: repoPath, remote: 'origin', ref: currentBranch, depth: 1, singleBranch: true, tags: false });
      const targetSha = await git.resolveRef({ fs, dir: repoPath, ref: remoteBranchRef });
      await git.branch({ fs, dir: repoPath, ref: currentBranch, object: targetSha, force: true });
      await git.checkout({ fs, dir: repoPath, ref: currentBranch, force: true });

      this.logger.debug(`Pulled repo ${repoUrl} to ${repoPath}`);
      return { success: true, message: '' };
    } catch (err) {
      return this.handleRepoError(err);
    }
  }

  /**
   * Given a repo id, delete it from the repos folder
   */
  public async deleteRepo(id: string) {
    try {
      const { dataDir } = this.configuration.get('directories');
      const repoPath = path.join(dataDir, 'repos', id);

      if (!(await this.filesystem.pathExists(repoPath))) {
        this.logger.info(`Repo ${id} does not exist`);
        return { success: false, message: `Repo ${id} does not exist` };
      }

      this.logger.info(`Deleting repo ${id} from ${repoPath}`);
      await this.filesystem.removeDirectory(repoPath);

      this.logger.info(`Deleted repo ${id} from ${repoPath}`);
      return { success: true, message: '' };
    } catch (err) {
      return this.handleRepoError(err);
    }
  }

  public async deleteAllRepos() {
    const { dataDir } = this.configuration.get('directories');
    const repos = await this.filesystem.listFiles(path.join(dataDir, 'repos'));

    for (const repo of repos) {
      await this.deleteRepo(repo);
    }

    return { success: true, message: '' };
  }
}
