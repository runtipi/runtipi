import { DATA_DIR, DEFAULT_APP_STORE } from '@/config/constants';
import { logger } from '@/lib/logger';
import { pathExists } from '@runtipi/shared/node';
import { appStoresFileSchema } from '@runtipi/shared';
import { promises } from 'fs';
import path from 'path';
import crypto from 'crypto';

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


export const getRepositoriesFromAppStoresFile = async () => {
    const appStoresFile = path.join(DATA_DIR, 'state', 'appstores.json')
    let appStoresParsed = {}
  
    if (!(await pathExists(appStoresFile))) {
      logger.error('Appstores file does not exist! Creating...')
      await promises.writeFile(appStoresFile, JSON.stringify({ appstores: [ DEFAULT_APP_STORE ] }))
      return { appstores: [ DEFAULT_APP_STORE ] };
    }
  
    const appStores = await promises.readFile(appStoresFile, 'utf-8')
  
    if (appStores === "") {
      logger.error('Appstores file exit! Returning default app store!')
      await promises.writeFile(appStoresFile, JSON.stringify({ appstores: [ DEFAULT_APP_STORE ] }))
      return { appstores: [ DEFAULT_APP_STORE ] };
    }
  
    try {
      appStoresParsed = JSON.parse(appStores)
    } catch {
      logger.error('Cannot parse schema to json! Returning default app store!')
      return { appstores: [ DEFAULT_APP_STORE ] };
    }
  
    const appStoresSafeParsed = await appStoresFileSchema.safeParseAsync(appStoresParsed)
  
    if (appStoresSafeParsed.error) {
      logger.error("Invalid appstore.json file! Returning default app store!")
      return { appstores: [ DEFAULT_APP_STORE ] };
    }
  
    if (appStoresSafeParsed.data.appstores.length === 0) {
      logger.error("App stores list empty! Writing default appstore!")
      await promises.writeFile(appStoresFile, JSON.stringify({ appstores: [ DEFAULT_APP_STORE ] }))
      return { appstores: [ DEFAULT_APP_STORE ] };
    }
  
    return appStoresSafeParsed.data
}