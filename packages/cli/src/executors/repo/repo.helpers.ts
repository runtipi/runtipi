import crypto from 'crypto';

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
