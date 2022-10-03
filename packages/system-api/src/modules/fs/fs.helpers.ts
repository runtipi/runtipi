import fs from 'fs-extra';
import childProcess from 'child_process';
import { getConfig } from '../../core/config/TipiConfig';

export const readJsonFile = (path: string): any => {
  try {
    const rawFile = fs.readFileSync(path).toString();

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

export const getSeed = () => {
  const seed = readFile('/runtipi/state/seed');
  return seed.toString();
};

export const ensureAppFolder = (appName: string, cleanup = false) => {
  if (cleanup && fileExists(`/runtipi/apps/${appName}`)) {
    deleteFolder(`/runtipi/apps/${appName}`);
  }

  if (!fileExists(`/runtipi/apps/${appName}/docker-compose.yml`)) {
    if (fileExists(`/runtipi/apps/${appName}`)) {
      deleteFolder(`/runtipi/apps/${appName}`);
    }
    // Copy from apps repo
    fs.copySync(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appName}`, `/runtipi/apps/${appName}`);
  }
};
