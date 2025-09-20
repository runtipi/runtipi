import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { settingsSchema } from '@/app.dto';
import { type LogLevel, LoggerService } from '@/core/logger/logger.service';
import { EnvUtils } from '@/modules/env/env.utils';
import dotenv from 'dotenv';
import { DATA_DIR } from '../constants';
import { type } from 'arktype';

const OLD_DEFAULT_REPO_URL = 'https://github.com/meienberger/runtipi-appstore';
export const DEFAULT_REPO_URL = 'https://github.com/runtipi/runtipi-appstore';

/**
 * Generates a random seed if it does not exist yet
 */
const generateSeed = async () => {
  const seedFilePath = path.join(DATA_DIR, 'state', 'seed');
  if (!fs.existsSync(seedFilePath)) {
    const randomBytes = crypto.randomBytes(32);
    const seed = randomBytes.toString('hex');
    await fs.promises.writeFile(seedFilePath, seed);
  }
};

/**
 * Returns the architecture of the current system
 */
const getArchitecture = () => {
  const arch = os.arch();

  if (arch === 'arm64') return 'arm64';
  if (arch === 'x64') return 'amd64';

  throw new Error(`Unsupported architecture: ${arch}`);
};

export const generateSystemEnvFile = async (): Promise<Map<string, string>> => {
  const logger = new LoggerService('backend', path.join(path.join(DATA_DIR, 'logs')), process.env.LOG_LEVEL as LogLevel);
  logger.info('Generating system env file');

  const envUtils = new EnvUtils();

  await fs.promises.mkdir(path.join(DATA_DIR, 'state'), { recursive: true });

  const settingsFilePath = path.join(DATA_DIR, 'state', 'settings.json');
  const envFilePath = path.join(DATA_DIR, '.env');

  if (!fs.existsSync(envFilePath)) {
    await fs.promises.writeFile(envFilePath, '');
  }

  const envFile = await fs.promises.readFile(envFilePath, 'utf-8');

  const envMap: Map<string, string> = envUtils.envStringToMap(envFile);
  envMap.set('NODE_ENV', process.env.NODE_ENV || 'production');

  if (!fs.existsSync(settingsFilePath)) {
    await fs.promises.writeFile(settingsFilePath, JSON.stringify({}));
  }

  const settingsFile = await fs.promises.readFile(settingsFilePath, 'utf-8');

  const settings = settingsSchema.partial()(JSON.parse(settingsFile));

  if (settings instanceof type.errors) {
    throw new Error(`Invalid settings.json file: ${settings.summary}`);
  }

  await generateSeed();

  if (settings.appsRepoUrl === OLD_DEFAULT_REPO_URL) {
    settings.appsRepoUrl = DEFAULT_REPO_URL;
  }

  const jwtSecret = envMap.get('JWT_SECRET') || envUtils.deriveEntropy('jwt_secret');

  const repoUrl = settings.appsRepoUrl || envMap.get('APPS_REPO_URL') || DEFAULT_REPO_URL;
  const hash = crypto.createHash('sha256');
  hash.update(repoUrl);
  const repoId = hash.digest('hex');

  const rootFolderHost = envMap.get('ROOT_FOLDER_HOST') || process.env.ROOT_FOLDER_HOST;
  const internalIp = envMap.get('INTERNAL_IP') || '127.0.0.1';

  if (!rootFolderHost) {
    throw new Error(
      'Failed to determine root folder host. If you are not running via the CLI, please set the ROOT_FOLDER_HOST environment variable.',
    );
  }

  // Ensure that the app data path does not contain the /app-data suffix
  let appDataPath = settings.appDataPath || envMap.get('RUNTIPI_APP_DATA_PATH');
  const appDataSegment = '/app-data';

  while (appDataPath?.endsWith(appDataSegment)) {
    logger.warn('Your app data path setting should not end with /app-data. Please remove the /app-data suffix.');
    appDataPath = appDataPath.slice(0, -appDataSegment.length);
  }

  envMap.set('ROOT_FOLDER_HOST', rootFolderHost);
  envMap.set('APPS_REPO_ID', repoId);
  envMap.set('APPS_REPO_URL', settings.appsRepoUrl || envMap.get('APPS_REPO_URL') || DEFAULT_REPO_URL);
  envMap.set('TZ', settings.timeZone || envMap.get('TZ') || Intl.DateTimeFormat().resolvedOptions().timeZone);
  envMap.set('INTERNAL_IP', settings.listenIp || internalIp);
  envMap.set('DNS_IP', settings.dnsIp || envMap.get('DNS_IP') || '9.9.9.9');
  envMap.set('ARCHITECTURE', getArchitecture());
  envMap.set('JWT_SECRET', jwtSecret);
  envMap.set('DOMAIN', settings.domain || envMap.get('DOMAIN') || 'example.com');
  envMap.set('RUNTIPI_APP_DATA_PATH', appDataPath || rootFolderHost);
  envMap.set('RUNTIPI_FORWARD_AUTH_URL', settings.forwardAuthUrl || envMap.get('RUNTIPI_FORWARD_AUTH_URL') || 'http://runtipi:3000/api/auth/traefik');
  envMap.set('POSTGRES_HOST', 'runtipi-db');
  envMap.set('POSTGRES_DBNAME', 'tipi');
  envMap.set('POSTGRES_USERNAME', 'tipi');
  envMap.set('POSTGRES_PORT', String(5432));
  envMap.set('DEMO_MODE', typeof settings.demoMode === 'boolean' ? String(settings.demoMode) : envMap.get('DEMO_MODE') || 'false');
  envMap.set(
    'GUEST_DASHBOARD',
    typeof settings.guestDashboard === 'boolean' ? String(settings.guestDashboard) : envMap.get('GUEST_DASHBOARD') || 'false',
  );
  envMap.set('LOCAL_DOMAIN', settings.localDomain || envMap.get('LOCAL_DOMAIN') || 'tipi.lan');
  envMap.set(
    'ALLOW_AUTO_THEMES',
    typeof settings.allowAutoThemes === 'boolean' ? String(settings.allowAutoThemes) : envMap.get('ALLOW_AUTO_THEMES') || 'true',
  );
  envMap.set(
    'ALLOW_ERROR_MONITORING',
    typeof settings.allowErrorMonitoring === 'boolean' ? String(settings.allowErrorMonitoring) : envMap.get('ALLOW_ERROR_MONITORING') || 'false',
  );
  envMap.set(
    'PERSIST_TRAEFIK_CONFIG',
    typeof settings.persistTraefikConfig === 'boolean' ? String(settings.persistTraefikConfig) : envMap.get('PERSIST_TRAEFIK_CONFIG') || 'false',
  );
  envMap.set(
    'QUEUE_TIMEOUT_IN_MINUTES',
    typeof settings.eventsTimeout === 'number' ? String(settings.eventsTimeout) : envMap.get('QUEUE_TIMEOUT_IN_MINUTES') || '5',
  );
  envMap.set(
    'ADVANCED_SETTINGS',
    typeof settings.advancedSettings === 'boolean' ? String(settings.advancedSettings) : envMap.get('ADVANCED_SETTINGS') || 'false',
  );
  envMap.set('LOG_LEVEL', settings.logLevel || envMap.get('LOG_LEVEL') || 'info');
  envMap.set('EXPERIMENTAL_INSECURE_COOKIE', settings.experimental_insecureCookie ? 'true' : 'false');
  envMap.set('THEME_BASE', settings.themeBase || envMap.get('THEME_BASE') || 'gray');
  envMap.set('THEME_COLOR', settings.themeColor || envMap.get('THEME_COLOR') || 'blue');

  await fs.promises.writeFile(envFilePath, envUtils.envMapToString(envMap));

  dotenv.config({ path: envFilePath, override: true });

  return envMap;
};
