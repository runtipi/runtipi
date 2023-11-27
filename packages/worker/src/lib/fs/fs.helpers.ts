/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { execAsync, pathExists } from '@runtipi/shared';
import path from 'path';
import { ROOT_FOLDER } from '@/config/constants';

export const ensureFilePermissions = async () => {
  const filesAndFolders = [path.join(ROOT_FOLDER, 'state'), path.join(ROOT_FOLDER, 'traefik')];

  const files600 = [path.join(ROOT_FOLDER, 'traefik', 'shared', 'acme.json')];

  // Give permission to read and write to all files and folders for the current user
  for (const fileOrFolder of filesAndFolders) {
    if (await pathExists(fileOrFolder)) {
      await execAsync(`chmod -R a+rwx ${fileOrFolder}`).catch(() => {});
    }
  }

  for (const fileOrFolder of files600) {
    if (await pathExists(fileOrFolder)) {
      await execAsync(`chmod 600 ${fileOrFolder}`).catch(() => {});
    }
  }
};
