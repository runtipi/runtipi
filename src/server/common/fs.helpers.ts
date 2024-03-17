import fs from 'fs';

export const readJsonFile = async (path: string): Promise<unknown | null> => {
  try {
    const rawFile = await fs.promises.readFile(path);

    return JSON.parse(rawFile.toString());
  } catch (e) {
    return null;
  }
};

export const readFile = async (path: string): Promise<string> => {
  try {
    const file = await fs.promises.readFile(path);
    return file.toString();
  } catch {
    return '';
  }
};
