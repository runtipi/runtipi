import { promises } from 'fs';
import { z } from 'zod';
import { settingsSchema } from '@runtipi/shared';
import { pathExists } from '@runtipi/shared/node';
import path from 'path';
import { BASE_PATH } from './constants';

export const setSettings = async (settings: z.infer<typeof settingsSchema>) => {
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
