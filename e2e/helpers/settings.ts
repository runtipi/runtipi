import { promises } from 'node:fs';
import path, { dirname } from 'node:path';
import type { z } from 'zod';
import type { settingsSchema } from '../../packages/backend/src/app.dto';
import { user } from '../../packages/backend/src/core/database/drizzle/schema';
import { BASE_PATH } from './constants';
import { db } from './db';

const pathExists = async (path: string) => {
  try {
    await promises.access(path);
    return true;
  } catch {
    return false;
  }
};

export const setSettings = async (settings: Partial<z.infer<typeof settingsSchema>>) => {
  await promises.mkdir(path.join(BASE_PATH, 'state'), { recursive: true });
  await promises.writeFile(path.join(BASE_PATH, 'state', 'settings.json'), JSON.stringify(settings));
};

export const setPassowrdChangeRequest = async () => {
  await promises.writeFile(path.join(BASE_PATH, 'state', 'password-change-request'), `${new Date().getTime() / 1000}`);
};

export const unsetPasswordChangeRequest = async () => {
  const requestPath = path.join(BASE_PATH, 'state', 'password-change-request');
  if (await pathExists(requestPath)) {
    await promises.unlink(requestPath);
  }
};

export const setWelcomeSeen = async (seen: boolean) => {
  await db.update(user).set({ hasSeenWelcome: seen });
  return Promise.resolve();
};

export const writeFile = async (filePath: string, content: string) => {
  const file = path.join(BASE_PATH, filePath);

  if (!(await pathExists(dirname(file)))) {
    await promises.mkdir(dirname(file), { recursive: true });
  }
  await promises.writeFile(file, content);
  return true;
};

export const readFile = async (filePath: string) => {
  const file = await promises.readFile(path.join(BASE_PATH, filePath), 'utf-8');
  return file;
};

export const deleteFile = async (filePath: string) => {
  const file = path.join(BASE_PATH, filePath);
  await promises.unlink(file);
};

export const emptyDir = async (dirPath: string) => {
  const dir = path.join(BASE_PATH, dirPath);
  const files: string[] = await promises.readdir(dir).catch(() => []);

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(dir, file);
      const stat = await promises.stat(filePath);
      if (stat.isDirectory()) {
        await promises.rm(filePath, { recursive: true, force: true });
      } else {
        await promises.unlink(filePath);
      }
    }),
  );
};
