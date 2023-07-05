import webpush from 'web-push';
import fs from 'fs-extra';

/**
 * Convert a string of environment variables to a Map
 *
 * @param {string} envString - String of environment variables
 */
export const envStringToMap = (envString: string) => {
  const envMap = new Map<string, string>();
  const envArray = envString.split('\n');

  envArray.forEach((env) => {
    const [key, value] = env.split('=');
    if (key && value) {
      envMap.set(key, value);
    }
  });

  return envMap;
};

/**
 * Convert a Map of environment variables to a valid string of environment variables
 * that can be used in a .env file
 *
 * @param {Map<string, string>} envMap - Map of environment variables
 */
export const envMapToString = (envMap: Map<string, string>) => {
  const envArray = Array.from(envMap).map(([key, value]) => `${key}=${value}`);
  return envArray.join('\n');
};

/**
 * This function reads the env file for the app with the provided id and returns a Map containing the key-value pairs of the environment variables.
 * It reads the app.env file, splits it into individual environment variables, and stores them in a Map, with the environment variable name as the key and its value as the value.
 *
 * @param {string} id - App ID
 */
export const getAppEnvMap = async (id: string) => {
  try {
    const envFile = await fs.promises.readFile(`/app/storage/app-data/${id}/app.env`);
    const envVars = envFile.toString().split('\n');
    const envVarsMap = new Map<string, string>();

    envVars.forEach((envVar) => {
      const [key, value] = envVar.split('=');
      if (key && value) envVarsMap.set(key, value);
    });

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
