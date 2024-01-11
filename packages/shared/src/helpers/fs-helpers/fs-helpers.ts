import fs from 'fs-extra';

export const pathExists = async (path: string): Promise<boolean> => {
  return fs.promises
    .access(path)
    .then(() => true)
    .catch(() => false);
};
