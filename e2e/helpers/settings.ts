import { promises } from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import type { settingsSchema } from '../../packages/backend/src/app.dto';
import { BASE_PATH } from './constants';

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
  const seenPath = path.join(BASE_PATH, 'state', 'seen-welcome');

  if (seen && !(await pathExists(seenPath))) {
    return promises.writeFile(seenPath, '');
  }

  if (!seen && (await pathExists(seenPath))) {
    return promises.unlink(seenPath);
  }

  return Promise.resolve();
};
