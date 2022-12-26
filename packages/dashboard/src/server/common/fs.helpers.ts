import fs from 'fs-extra';

export const readJsonFile = (path: string): unknown | null => {
  try {
    const rawFile = fs.readFileSync(path).toString();

    return JSON.parse(rawFile);
  } catch (e) {
    return null;
  }
};
