import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR } from '@/config/constants';
import { sanitizePath } from '@runtipi/shared';
import webpush from 'web-push';

/**
 * This function reads the env file for the app with the provided id and returns a Map containing the key-value pairs of the environment variables.
 * It reads the app.env file, splits it into individual environment variables, and stores them in a Map, with the environment variable name as the key and its value as the value.
 *
 * @param {string} appId - App ID
 */
export const getAppEnvMap = async (appId: string) => {
  try {
    const envFile = await fs.promises.readFile(path.join(APP_DATA_DIR, sanitizePath(appId), 'app.env'));
    const envVars = envFile.toString().split('\n');
    const envVarsMap = new Map<string, string>();

    for (const envVar of envVars) {
      if (envVar.startsWith('#')) continue;

      const [key, ...rest] = envVar.split('=');
      if (key && rest.length) envVarsMap.set(key, rest.join('='));
    }

    return envVarsMap;
  } catch (e) {
    return new Map<string, string>();
  }
};

/**
 * Generate VAPID keys
 */
export const generateVapidKeys = () => {
  const vapidKeys = webpush.generateVAPIDKeys();
  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
  };
};
