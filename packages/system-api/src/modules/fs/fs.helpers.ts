import fs from 'fs-extra';
import childProcess from 'child_process';
import { getConfig } from '../../core/config/TipiConfig';

export const getAbsolutePath = (path: string) => `${getConfig().rootFolder}${path}`;

export const readJsonFile = (path: string): any => {
  try {
    const rawFile = fs.readFileSync(getAbsolutePath(path))?.toString();

    if (!rawFile) {
      return null;
    }

    return JSON.parse(rawFile);
  } catch (e) {
    return null;
  }
};

export const readFile = (path: string): string => {
  try {
    return fs.readFileSync(getAbsolutePath(path)).toString();
  } catch {
    return '';
  }
};

export const readdirSync = (path: string): string[] => fs.readdirSync(getAbsolutePath(path));

export const fileExists = (path: string): boolean => fs.existsSync(getAbsolutePath(path));

export const writeFile = (path: string, data: any) => fs.writeFileSync(getAbsolutePath(path), data);

export const createFolder = (path: string) => {
  if (!fileExists(path)) {
    fs.mkdirSync(getAbsolutePath(path));
  }
};
export const deleteFolder = (path: string) => fs.rmSync(getAbsolutePath(path), { recursive: true });

export const runScript = (path: string, args: string[], callback?: any) => childProcess.execFile(getAbsolutePath(path), args, {}, callback);

export const getSeed = () => {
  const seed = readFile('/state/seed');
  return seed.toString();
};

export const ensureAppFolder = (appName: string, cleanup = false) => {
  if (cleanup && fileExists(`/apps/${appName}`)) {
    deleteFolder(`/apps/${appName}`);
  }

  if (!fileExists(`/apps/${appName}/docker-compose.yml`)) {
    if (fileExists(`/apps/${appName}`)) deleteFolder(`/apps/${appName}`);
    // Copy from apps repo
    fs.copySync(getAbsolutePath(`/repos/${getConfig().appsRepoId}/apps/${appName}`), getAbsolutePath(`/apps/${appName}`));
  }
};
