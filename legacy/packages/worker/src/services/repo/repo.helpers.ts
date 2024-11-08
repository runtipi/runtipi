import crypto from 'node:crypto';

/**
 * Given a repo url, return a hash of it to be used as a folder name
 *
 * @param {string} repoUrl
 */
export const getRepoHash = (repoUrl: string) => {
  const hash = crypto.createHash('sha256');
  hash.update(repoUrl);
  return hash.digest('hex');
};

/**
 * Extracts the base URL and branch from a repository URL.
 * @param repoUrl The repository URL.
 * @returns An array containing the base URL and branch, or just the base URL if no branch is found.
 */
export const getRepoBaseUrlAndBranch = (repoUrl: string) => {
  const branchMatch = repoUrl.match(/^(.*)\/tree\/(.*)$/);
  if (branchMatch) {
    return [branchMatch[1], branchMatch[2]];
  }

  return [repoUrl, undefined];
};
