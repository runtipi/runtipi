import fs from 'fs-extra';

export const readJsonFile = (path: string): unknown | null => {
  try {
    const rawFile = fs.readFileSync(path).toString();

    return JSON.parse(rawFile);
  } catch (e) {
    return null;
  }
};

export const readFile = (path: string): string => {
  try {
    return fs.readFileSync(path).toString();
  } catch {
    return '';
  }
};

export const readdirSync = (path: string): string[] => fs.readdirSync(path);

export const fileExists = (path: string): boolean => fs.existsSync(path);
