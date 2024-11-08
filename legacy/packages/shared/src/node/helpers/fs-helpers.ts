import fs from 'node:fs';

export const pathExists = async (path: string): Promise<boolean> => {
  return fs.promises
    .access(path)
    .then(() => true)
    .catch(() => false);
};
