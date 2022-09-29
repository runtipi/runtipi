import fs from 'fs-extra';
import childProcess from 'child_process';
import { getConfig } from '../../core/config/TipiConfig';

export const readJsonFile = (path: string): any => {
  try {
    const rawFile = fs.readFileSync(path)?.toString();

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
    return fs.readFileSync(path).toString();
  } catch {
    return '';
  }
};

export const readdirSync = (path: string): string[] => fs.readdirSync(path);

export const fileExists = (path: string): boolean => fs.existsSync(path);

export const writeFile = (path: string, data: any) => fs.writeFileSync(path, data);

export const createFolder = (path: string) => {
  if (!fileExists(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
};
export const deleteFolder = (path: string) => fs.rmSync(path, { recursive: true });

export const runScript = (path: string, args: string[], callback?: any) => childProcess.execFile(path, args, {}, callback);

export const getSeed = () => {
  const seed = readFile('/runtipi/state/seed');
  return seed.toString();
};

export const ensureAppFolder = (appName: string, cleanup = false) => {
  if (cleanup && fileExists(`/app/storage/apps/${appName}`)) {
    deleteFolder(`/app/storage/apps/${appName}`);
  }

  if (!fileExists(`/app/storage/apps/${appName}/docker-compose.yml`)) {
    if (fileExists(`/app/storage/apps/${appName}`)) deleteFolder(`/app/storage/apps/${appName}`);
    // Copy from apps repo
    fs.copySync(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appName}`, `/app/storage/apps/${appName}`);
  }
};
