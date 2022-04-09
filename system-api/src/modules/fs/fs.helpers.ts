import fs from 'fs';
import childProcess from 'child_process';
import config from '../../config';

export const getAbsolutePath = (path: string) => `${config.ROOT_FOLDER}${path}`;

export const readJsonFile = (path: string): any => {
  const rawFile = fs.readFileSync(getAbsolutePath(path)).toString();
  return JSON.parse(rawFile);
};

export const fileExists = (path: string): boolean => fs.existsSync(getAbsolutePath(path));

export const writeFile = (path: string, data: any) => fs.writeFileSync(getAbsolutePath(path), data);

export const createFolder = (path: string) => fs.mkdirSync(getAbsolutePath(path));
export const deleteFolder = (path: string) => fs.rmSync(getAbsolutePath(path), { recursive: true });

export const copyFile = (source: string, destination: string) => fs.copyFileSync(getAbsolutePath(source), getAbsolutePath(destination));

export const runScript = (path: string, args: string[]) => childProcess.spawnSync(getAbsolutePath(path), args, {});
