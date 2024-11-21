import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { settingsSchema } from '@/app.dto';
import { EnvUtils } from '@/modules/env/env.utils';
import dotenv from 'dotenv';
import { DATA_DIR } from '../constants';

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

  const settings = settingsSchema.partial().safeParse(JSON.parse(settingsFile));

  if (!settings.success) {
    throw new Error(`Invalid settings.json file: ${settings.error.message}`);
  }

  await generateSeed();

  const { data } = settings;

  if (data.appsRepoUrl === OLD_DEFAULT_REPO_URL) {
    data.appsRepoUrl = DEFAULT_REPO_URL;
  }

  const jwtSecret = envMap.get('JWT_SECRET') || envUtils.deriveEntropy('jwt_secret');

  const repoUrl = data.appsRepoUrl || envMap.get('APPS_REPO_URL') || DEFAULT_REPO_URL;
  const hash = crypto.createHash('sha256');
  hash.update(repoUrl);
  const repoId = hash.digest('hex');

  const rootFolderHost = envMap.get('ROOT_FOLDER_HOST') ?? process.env.ROOT_FOLDER_HOST;
  const internalIp = envMap.get('INTERNAL_IP') ?? '127.0.0.1';

  if (!rootFolderHost) {
    throw new Error(
      'Failed to determine root folder host. If you are not running via the CLI, please set the ROOT_FOLDER_HOST environment variable.',
    );
  }

  // Ensure that the app data path does not contain the /app-data suffix
  const fixedAppDataPath = data.appDataPath?.split('/app-data')[0];

  envMap.set('ROOT_FOLDER_HOST', rootFolderHost);
  envMap.set('APPS_REPO_ID', repoId);
  envMap.set('APPS_REPO_URL', data.appsRepoUrl || envMap.get('APPS_REPO_URL') || DEFAULT_REPO_URL);
  envMap.set('TZ', data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  envMap.set('INTERNAL_IP', data.listenIp || internalIp);
  envMap.set('DNS_IP', data.dnsIp || envMap.get('DNS_IP') || '9.9.9.9');
  envMap.set('ARCHITECTURE', getArchitecture());
  envMap.set('JWT_SECRET', jwtSecret);
  envMap.set('DOMAIN', data.domain || envMap.get('DOMAIN') || 'example.com');
  envMap.set('RUNTIPI_APP_DATA_PATH', fixedAppDataPath || envMap.get('RUNTIPI_APP_DATA_PATH') || rootFolderHost);
  envMap.set('POSTGRES_HOST', 'runtipi-db');
  envMap.set('POSTGRES_DBNAME', 'tipi');
  envMap.set('POSTGRES_USERNAME', 'tipi');
  envMap.set('POSTGRES_PORT', String(5432));
  envMap.set('DEMO_MODE', typeof data.demoMode === 'boolean' ? String(data.demoMode) : envMap.get('DEMO_MODE') || 'false');
  envMap.set('GUEST_DASHBOARD', typeof data.guestDashboard === 'boolean' ? String(data.guestDashboard) : envMap.get('GUEST_DASHBOARD') || 'false');
  envMap.set('LOCAL_DOMAIN', data.localDomain || envMap.get('LOCAL_DOMAIN') || 'tipi.lan');
  envMap.set(
    'ALLOW_AUTO_THEMES',
    typeof data.allowAutoThemes === 'boolean' ? String(data.allowAutoThemes) : envMap.get('ALLOW_AUTO_THEMES') || 'true',
  );
  envMap.set(
    'ALLOW_ERROR_MONITORING',
    typeof data.allowErrorMonitoring === 'boolean' ? String(data.allowErrorMonitoring) : envMap.get('ALLOW_ERROR_MONITORING') || 'false',
  );
  envMap.set(
    'PERSIST_TRAEFIK_CONFIG',
    typeof data.persistTraefikConfig === 'boolean' ? String(data.persistTraefikConfig) : envMap.get('PERSIST_TRAEFIK_CONFIG') || 'false',
  );

  await fs.promises.writeFile(envFilePath, envUtils.envMapToString(envMap));

  dotenv.config({ path: envFilePath, override: true });

  return envMap;
};
