import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { getEnv } from '@/lib/environment';
import { getMainEnvMap } from '@/lib/system/system.helpers';
import { type AppEventForm, appInfoSchema, envMapToString, envStringToMap, sanitizePath } from '@runtipi/shared';
import { execAsync, pathExists } from '@runtipi/shared/node';
import { generateVapidKeys, getAppEnvMap } from './env.helpers';

/**
 *  This function generates a random string of the provided length by using the SHA-256 hash algorithm.
 *  It takes the provided name and a seed value, concatenates them, and uses them as input for the hash algorithm.
 *  It then returns a substring of the resulting hash of the provided length.
 *
 *  @param {string} name - A name used as input for the hash algorithm.
 *  @param {number} length - The desired length of the random string.
 */
const getEntropy = async (name: string, length: number) => {
  const hash = crypto.createHash('sha256');
  const seed = await fs.promises.readFile(path.join(DATA_DIR, 'state', 'seed'));

  hash.update(name + seed.toString());
  return hash.digest('hex').substring(0, length);
};

/**
 * This function generates an env file for the provided app.
 * It reads the config.json file for the app, parses it,
 * and uses the app's form fields and domain to generate the env file
 * if the app is exposed and has a domain set, it adds the domain to the env file,
 * otherwise, it adds the internal IP address to the env file
 * It also creates the app-data folder for the app if it does not exist
 *
 * @param {string} appId - The id of the app to generate the env file for.
 * @param {AppEventForm} form - The config object for the app.
 * @throws Will throw an error if the app has an invalid config.json file or if a required variable is missing.
 */
export const generateEnvFile = async (appId: string, form: AppEventForm) => {
  const { internalIp, appDataPath, rootFolderHost } = getEnv();

  const configFile = await fs.promises.readFile(path.join(DATA_DIR, 'apps', sanitizePath(appId), 'config.json'));
  const parsedConfig = appInfoSchema.safeParse(JSON.parse(configFile.toString()));

  if (!parsedConfig.success) {
    throw new Error(`App ${appId} has invalid config.json file`);
  }

  const baseEnvFile = await fs.promises.readFile(path.join(DATA_DIR, '.env'));
  const envMap = envStringToMap(baseEnvFile.toString());

  // Default always present env variables
  envMap.set('APP_PORT', String(parsedConfig.data.port));
  envMap.set('APP_ID', appId);
  envMap.set('ROOT_FOLDER_HOST', rootFolderHost);
  envMap.set('APP_DATA_DIR', path.join(appDataPath, 'app-data', sanitizePath(appId)));

  const existingEnvMap = await getAppEnvMap(appId);

  if (parsedConfig.data.generate_vapid_keys) {
    if (existingEnvMap.has('VAPID_PUBLIC_KEY') && existingEnvMap.has('VAPID_PRIVATE_KEY')) {
      envMap.set('VAPID_PUBLIC_KEY', existingEnvMap.get('VAPID_PUBLIC_KEY') as string);
      envMap.set('VAPID_PRIVATE_KEY', existingEnvMap.get('VAPID_PRIVATE_KEY') as string);
    } else {
      const vapidKeys = generateVapidKeys();
      envMap.set('VAPID_PUBLIC_KEY', vapidKeys.publicKey);
      envMap.set('VAPID_PRIVATE_KEY', vapidKeys.privateKey);
    }
  }

  await Promise.all(
    parsedConfig.data.form_fields.map(async (field) => {
      const formValue = form[field.env_variable];
      const envVar = field.env_variable;

      if (formValue || typeof formValue === 'boolean') {
        envMap.set(envVar, String(formValue));
      } else if (field.type === 'random') {
        if (existingEnvMap.has(envVar)) {
          envMap.set(envVar, existingEnvMap.get(envVar) as string);
        } else {
          const length = field.min || 32;
          const randomString = await getEntropy(field.env_variable, length);

          envMap.set(envVar, randomString);
        }
      } else if (field.required) {
        throw new Error(`Variable ${field.label || field.env_variable} is required`);
      }
    }),
  );

  if (form.exposed && form.domain && typeof form.domain === 'string') {
    envMap.set('APP_EXPOSED', 'true');
    envMap.set('APP_DOMAIN', form.domain);
    envMap.set('APP_HOST', form.domain);
    envMap.set('APP_PROTOCOL', 'https');
  } else if (form.exposedLocal && !form.openPort) {
    const mainEnvMap = await getMainEnvMap();
    envMap.set('APP_DOMAIN', `${parsedConfig.data.id}.${mainEnvMap.get('LOCAL_DOMAIN')}`);
    envMap.set('APP_HOST', `${parsedConfig.data.id}.${mainEnvMap.get('LOCAL_DOMAIN')}`);
    envMap.set('APP_PROTOCOL', 'https');
  } else {
    envMap.set('APP_DOMAIN', `${internalIp}:${parsedConfig.data.port}`);
    envMap.set('APP_HOST', internalIp);
    envMap.set('APP_PROTOCOL', 'http');
  }

  // Create app-data folder if it doesn't exist
  const appDataDirectoryExists = await fs.promises.stat(path.join(APP_DATA_DIR, sanitizePath(appId))).catch(() => false);
  if (!appDataDirectoryExists) {
    await fs.promises.mkdir(path.join(APP_DATA_DIR, sanitizePath(appId)), { recursive: true });
  }

  await fs.promises.writeFile(path.join(APP_DATA_DIR, sanitizePath(appId), 'app.env'), envMapToString(envMap));
};

/**
 * Given a template and a map of variables, this function replaces all instances of the variables in the template with their values.
 *
 * @param {string} template - The template to be rendered.
 * @param {Map<string, string>} envMap - The map of variables and their values.
 */
const renderTemplate = (template: string, envMap: Map<string, string>) => {
  let renderedTemplate = template;

  envMap.forEach((value, key) => {
    const safeKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    renderedTemplate = renderedTemplate.replace(new RegExp(`{{${safeKey}}}`, 'g'), value);
  });

  return renderedTemplate;
};

/**
 * Given an app, this function copies the app's data directory to the app-data folder.
 * If a file with an extension of .template is found, it will be copied as a file without the .template extension and the template variables will be replaced
 * by the values in the app's env file.
 *
 * @param {string} id - The id of the app.
 */
export const copyDataDir = async (id: string) => {
  const envMap = await getAppEnvMap(id);

  // return if app does not have a data directory
  if (!(await pathExists(path.join(DATA_DIR, 'apps', sanitizePath(id), 'data')))) {
    return;
  }

  // Create app-data folder if it doesn't exist
  if (!(await pathExists(path.join(APP_DATA_DIR, sanitizePath(id), 'data')))) {
    await fs.promises.mkdir(path.join(APP_DATA_DIR, sanitizePath(id), 'data'), { recursive: true });
  }

  const dataDir = await fs.promises.readdir(path.join(DATA_DIR, 'apps', sanitizePath(id), 'data'));

  const processFile = async (file: string) => {
    if (file.endsWith('.template')) {
      const template = await fs.promises.readFile(path.join(DATA_DIR, 'apps', sanitizePath(id), 'data', file), 'utf-8');
      const renderedTemplate = renderTemplate(template, envMap);

      await fs.promises.writeFile(path.join(APP_DATA_DIR, sanitizePath(id), 'data', file.replace('.template', '')), renderedTemplate);
    } else {
      await fs.promises.copyFile(
        path.join(DATA_DIR, 'apps', sanitizePath(id), 'data', file),
        path.join(APP_DATA_DIR, sanitizePath(id), 'data', file),
      );
    }
  };

  const processDir = async (p: string) => {
    await fs.promises.mkdir(path.join(APP_DATA_DIR, sanitizePath(id), 'data', p), {
      recursive: true,
    });

    const files = await fs.promises.readdir(path.join(DATA_DIR, 'apps', sanitizePath(id), 'data', p));

    await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(DATA_DIR, 'apps', sanitizePath(id), 'data', p, file);

        if ((await fs.promises.lstat(fullPath)).isDirectory()) {
          await processDir(path.join(p, file));
        } else {
          await processFile(path.join(p, file));
        }
      }),
    );
  };

  await Promise.all(
    dataDir.map(async (file) => {
      const fullPath = path.join(DATA_DIR, 'apps', sanitizePath(id), 'data', file);

      if ((await fs.promises.lstat(fullPath)).isDirectory()) {
        await processDir(file);
      } else {
        await processFile(file);
      }
    }),
  );

  // Remove any .gitkeep files from the app-data folder at any level
  if (await pathExists(path.join(APP_DATA_DIR, sanitizePath(id), 'data'))) {
    await execAsync(`find ${APP_DATA_DIR}/${sanitizePath(id)}/data -name .gitkeep -delete`).catch(() => {});
  }
};
