import { promises } from 'fs';
import { z } from 'zod';
import { settingsSchema } from '@runtipi/shared';
import { pathExists } from '@runtipi/shared/node';
import { execRemoteCommand } from './write-remote-file';

export const setSettings = async (settings: z.infer<typeof settingsSchema>) => {
  if (process.env.REMOTE === 'true') {
    await execRemoteCommand(`mkdir -p ./data/state`);
    await execRemoteCommand(`echo '${JSON.stringify(settings)}' > ./data/state/settings.json`);
  } else {
    // Create state folder if it doesn't exist
    await promises.mkdir('./state', { recursive: true });

    await promises.writeFile('./state/settings.json', JSON.stringify(settings));
  }
};

export const setPassowrdChangeRequest = async () => {
  if (process.env.REMOTE === 'true') {
    await execRemoteCommand('touch ./data/state/password-change-request');
  } else {
    await promises.writeFile('./state/password-change-request', '');
  }
};

export const unsetPasswordChangeRequest = async () => {
  if (process.env.REMOTE === 'true') {
    await execRemoteCommand('rm ./data/state/password-change-request');
  } else if (await pathExists('./state/password-change-request')) {
    await promises.unlink('./state/password-change-request');
  }
};

export const setWelcomeSeen = async (seen: boolean) => {
  if (seen && process.env.REMOTE === 'true') {
    return execRemoteCommand('touch ./data/state/seen-welcome');
  }

  if (!seen && process.env.REMOTE === 'true') {
    return execRemoteCommand('rm ./data/state/seen-welcome');
  }

  if (seen && !(await pathExists('./state/seen-welcome'))) {
    return promises.writeFile('./state/seen-welcome', '');
  }

  if (!seen && (await pathExists('./state/seen-welcome'))) {
    return promises.unlink('./state/seen-welcome');
  }

  return Promise.resolve();
};
