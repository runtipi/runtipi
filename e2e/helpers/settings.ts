import { promises } from 'fs';
import { z } from 'zod';
import { settingsSchema } from '@runtipi/shared';
import { pathExists } from '@runtipi/shared/node';
import { execRemoteCommand } from './write-remote-file';

export const setSettings = async (settings: z.infer<typeof settingsSchema>) => {
  if (process.env.REMOTE === 'true') {
    await execRemoteCommand(`mkdir -p ./runtipi/state`);
    await execRemoteCommand(`echo '${JSON.stringify(settings)}' > ./runtipi/state/settings.json`);
  } else {
    // Create state folder if it doesn't exist
    await promises.mkdir('./state', { recursive: true });

    await promises.writeFile('./state/settings.json', JSON.stringify(settings));
  }
};

export const setPassowrdChangeRequest = async () => {
  if (process.env.REMOTE === 'true') {
    // Write date in ms to file
    await execRemoteCommand('touch ./runtipi/state/password-change-request && echo $(date +%s) >> ./runtipi/state/password-change-request');
  } else {
    await promises.writeFile('./state/password-change-request', `${new Date().getTime() / 1000}`);
  }
};

export const unsetPasswordChangeRequest = async () => {
  if (process.env.REMOTE === 'true') {
    await execRemoteCommand('rm ./runtipi/state/password-change-request');
  } else if (await pathExists('./state/password-change-request')) {
    await promises.unlink('./state/password-change-request');
  }
};

export const setWelcomeSeen = async (seen: boolean) => {
  if (seen && process.env.REMOTE === 'true') {
    return execRemoteCommand('touch ./runtipi/state/seen-welcome');
  }

  if (!seen && process.env.REMOTE === 'true') {
    return execRemoteCommand('rm ./runtipi/state/seen-welcome');
  }

  if (seen && !(await pathExists('./state/seen-welcome'))) {
    return promises.writeFile('./state/seen-welcome', '');
  }

  if (!seen && (await pathExists('./state/seen-welcome'))) {
    return promises.unlink('./state/seen-welcome');
  }

  return Promise.resolve();
};
