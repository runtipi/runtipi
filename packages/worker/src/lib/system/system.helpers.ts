/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { envMapToString, envStringToMap, execAsync, pathExists, settingsSchema } from '@runtipi/shared';
import { logger } from '../logger/logger';
import { getRepoHash } from '../../services/repo/repo.helpers';
import { ROOT_FOLDER } from '@/config/constants';

type EnvKeys =
  | 'APPS_REPO_ID'
  | 'APPS_REPO_URL'
  | 'TZ'
  | 'INTERNAL_IP'
  | 'DNS_IP'
  | 'ARCHITECTURE'
  | 'TIPI_VERSION'
  | 'JWT_SECRET'
  | 'ROOT_FOLDER_HOST'
  | 'NGINX_PORT'
  | 'NGINX_PORT_SSL'
  | 'DOMAIN'
  | 'STORAGE_PATH'
  | 'POSTGRES_PORT'
  | 'POSTGRES_HOST'
  | 'POSTGRES_DBNAME'
  | 'POSTGRES_PASSWORD'
  | 'POSTGRES_USERNAME'
  | 'REDIS_HOST'
  | 'REDIS_PASSWORD'
  | 'LOCAL_DOMAIN'
  | 'DEMO_MODE'
  | 'GUEST_DASHBOARD'
  | 'TIPI_GID'
  | 'TIPI_UID'
  | 'ALLOW_ERROR_MONITORING'
  | 'NODE_ENV'
  | 'PERSIST_TRAEFIK_CONFIG'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

const OLD_DEFAULT_REPO_URL = 'https://github.com/meienberger/runtipi-appstore';
const DEFAULT_REPO_URL = 'https://github.com/runtipi/runtipi-appstore';

/**
 * Reads and returns the generated seed
 */
const getSeed = async () => {
  const seedFilePath = path.join(ROOT_FOLDER, 'state', 'seed');

  if (!(await pathExists(seedFilePath))) {
    throw new Error('Seed file not found');
  }

  const seed = await fs.promises.readFile(seedFilePath, 'utf-8');

  return seed;
};

/**
 * Derives a new entropy value from the provided entropy and the seed
 * @param {string} entropy - The entropy value to derive from
 */
const deriveEntropy = async (entropy: string) => {
  const seed = await getSeed();
  const hmac = crypto.createHmac('sha256', seed);
  hmac.update(entropy);

  return hmac.digest('hex');
};

/**
 * Generates a random seed if it does not exist yet
 */
const generateSeed = async () => {
  if (!(await pathExists(path.join(ROOT_FOLDER, 'state', 'seed')))) {
    const randomBytes = crypto.randomBytes(32);
    const seed = randomBytes.toString('hex');

    await fs.promises.writeFile(path.join(ROOT_FOLDER, 'state', 'seed'), seed);
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

/**
 * Generates a valid .env file from the settings.json file
 */
export const generateSystemEnvFile = async () => {
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'state'), { recursive: true });
  const settingsFilePath = path.join(ROOT_FOLDER, 'state', 'settings.json');
  const envFilePath = path.join(ROOT_FOLDER, '.env');

  if (!(await pathExists(envFilePath))) {
    await fs.promises.writeFile(envFilePath, '');
  }

  const envFile = await fs.promises.readFile(envFilePath, 'utf-8');

  const envMap: Map<EnvKeys, string> = envStringToMap(envFile);

  if (!(await pathExists(settingsFilePath))) {
    await fs.promises.writeFile(settingsFilePath, JSON.stringify({}));
  }

  const settingsFile = await fs.promises.readFile(settingsFilePath, 'utf-8');

  const settings = settingsSchema.safeParse(JSON.parse(settingsFile));

  if (!settings.success) {
    throw new Error(`Invalid settings.json file: ${settings.error.message}`);
  }

  await generateSeed();

  const { data } = settings;

  if (data.appsRepoUrl === OLD_DEFAULT_REPO_URL) {
    data.appsRepoUrl = DEFAULT_REPO_URL;
  }

  const jwtSecret = envMap.get('JWT_SECRET') || (await deriveEntropy('jwt_secret'));
  const repoId = getRepoHash(data.appsRepoUrl || envMap.get('APPS_REPO_URL') || DEFAULT_REPO_URL);

  const rootFolderHost = envMap.get('ROOT_FOLDER_HOST');
  const internalIp = envMap.get('INTERNAL_IP');

  if (!rootFolderHost) {
    throw new Error('ROOT_FOLDER_HOST not set in .env file');
  }

  if (!internalIp) {
    throw new Error('INTERNAL_IP not set in .env file');
  }

  envMap.set('APPS_REPO_ID', repoId);
  envMap.set('APPS_REPO_URL', data.appsRepoUrl || envMap.get('APPS_REPO_URL') || DEFAULT_REPO_URL);
  envMap.set('TZ', envMap.get('TZ') || Intl.DateTimeFormat().resolvedOptions().timeZone);
  envMap.set('INTERNAL_IP', data.listenIp || internalIp);
  envMap.set('DNS_IP', data.dnsIp || envMap.get('DNS_IP') || '9.9.9.9');
  envMap.set('ARCHITECTURE', getArchitecture());
  envMap.set('JWT_SECRET', jwtSecret);
  envMap.set('DOMAIN', data.domain || envMap.get('DOMAIN') || 'example.com');
  envMap.set('STORAGE_PATH', data.storagePath || envMap.get('STORAGE_PATH') || rootFolderHost);
  envMap.set('POSTGRES_HOST', 'tipi-db');
  envMap.set('POSTGRES_DBNAME', 'tipi');
  envMap.set('POSTGRES_USERNAME', 'tipi');
  envMap.set('POSTGRES_PORT', String(5432));
  envMap.set('REDIS_HOST', 'tipi-redis');
  envMap.set('DEMO_MODE', typeof data.demoMode === 'boolean' || typeof data.demoMode === 'string' ? String(data.demoMode) : envMap.get('DEMO_MODE') || 'false');
  envMap.set('GUEST_DASHBOARD', typeof data.guestDashboard === 'boolean' || typeof data.guestDashboard === 'string' ? String(data.guestDashboard) : envMap.get('GUEST_DASHBOARD') || 'false');
  envMap.set('LOCAL_DOMAIN', data.localDomain || envMap.get('LOCAL_DOMAIN') || 'tipi.lan');
  envMap.set('NODE_ENV', process.env.NODE_ENV || 'production');
  envMap.set(
    'ALLOW_ERROR_MONITORING',
    typeof data.allowErrorMonitoring === 'boolean' || typeof data.allowErrorMonitoring === 'string' ? String(data.allowErrorMonitoring) : envMap.get('ALLOW_ERROR_MONITORING') || 'false',
  );
  envMap.set(
    'PERSIST_TRAEFIK_CONFIG',
    typeof data.persistTraefikConfig === 'boolean' || typeof data.persistTraefikConfig === 'string' ? String(data.persistTraefikConfig) : envMap.get('PERSIST_TRAEFIK_CONFIG') || 'false',
  );
  await fs.promises.writeFile(envFilePath, envMapToString(envMap));

  return envMap;
};

/**
 * Copies the system files from the assets folder to the current working directory
 */
export const copySystemFiles = async () => {
  // Remove old unused files
  if (await pathExists(path.join(ROOT_FOLDER, 'scripts'))) {
    logger.info('Removing old scripts folder');
    await fs.promises.rmdir(path.join(ROOT_FOLDER, 'scripts'), { recursive: true });
  }

  const envFilePath = path.join(ROOT_FOLDER, '.env');
  const envFile = await fs.promises.readFile(envFilePath, 'utf-8');
  const envMap: Map<EnvKeys, string> = envStringToMap(envFile);

  const assetsFolder = path.join(ROOT_FOLDER, 'assets');

  // Copy traefik folder from assets
  logger.info('Creating traefik folders');
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'traefik', 'dynamic'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'traefik', 'shared'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'traefik', 'tls'), { recursive: true });

  if (envMap.get('PERSIST_TRAEFIK_CONFIG') === 'true') {
    logger.warn('Skipping the copy of traefik files because persistTraefikConfig is set to true');
  } else {
    logger.info('Copying traefik files');
    await fs.promises.copyFile(path.join(assetsFolder, 'traefik', 'traefik.yml'), path.join(ROOT_FOLDER, 'traefik', 'traefik.yml'));
    await fs.promises.copyFile(path.join(assetsFolder, 'traefik', 'dynamic', 'dynamic.yml'), path.join(ROOT_FOLDER, 'traefik', 'dynamic', 'dynamic.yml'));
  }

  // Create base folders
  logger.info('Creating base folders');
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'apps'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'app-data'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'state'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'repos'), { recursive: true });

  // Create media folders
  logger.info('Creating media folders');
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'torrents', 'watch'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'torrents', 'complete'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'torrents', 'incomplete'), { recursive: true });

  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'usenet', 'watch'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'usenet', 'complete'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'usenet', 'incomplete'), { recursive: true });

  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'downloads', 'watch'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'downloads', 'complete'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'downloads', 'incomplete'), { recursive: true });

  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'books'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'comics'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'movies'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'music'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'tv'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'podcasts'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'images'), { recursive: true });
  await fs.promises.mkdir(path.join(ROOT_FOLDER, 'media', 'data', 'roms'), { recursive: true });
};

/**
 * Given a domain, generates the TLS certificates for it to be used with Traefik
 *
 * @param {string} data.domain The domain to generate the certificates for
 */
export const generateTlsCertificates = async (data: { domain?: string }) => {
  if (!data.domain) {
    return;
  }

  // If the certificate already exists, don't generate it again
  if (await pathExists(path.join(ROOT_FOLDER, 'traefik', 'tls', `${data.domain}.txt`))) {
    logger.info(`TLS certificate for ${data.domain} already exists`);
    return;
  }

  // Remove old certificates
  if (await pathExists(path.join(ROOT_FOLDER, 'traefik', 'tls', 'cert.pem'))) {
    logger.info('Removing old TLS certificate');
    await fs.promises.unlink(path.join(ROOT_FOLDER, 'traefik', 'tls', 'cert.pem'));
  }
  if (await pathExists(path.join(ROOT_FOLDER, 'traefik', 'tls', 'key.pem'))) {
    logger.info('Removing old TLS key');
    await fs.promises.unlink(path.join(ROOT_FOLDER, 'traefik', 'tls', 'key.pem'));
  }

  const subject = `/O=runtipi.io/OU=IT/CN=*.${data.domain}/emailAddress=webmaster@${data.domain}`;
  const subjectAltName = `DNS:*.${data.domain},DNS:${data.domain}`;

  try {
    logger.info(`Generating TLS certificate for ${data.domain}`);
    await execAsync(`openssl req -x509 -newkey rsa:4096 -keyout traefik/tls/key.pem -out traefik/tls/cert.pem -days 365 -subj "${subject}" -addext "subjectAltName = ${subjectAltName}" -nodes`);
    logger.info(`Writing txt file for ${data.domain}`);
    await fs.promises.writeFile(path.join(ROOT_FOLDER, 'traefik', 'tls', `${data.domain}.txt`), '');
  } catch (error) {
    logger.error(error);
  }
};

export const ensureFilePermissions = async () => {
  const filesAndFolders = [path.join(ROOT_FOLDER, 'state'), path.join(ROOT_FOLDER, 'traefik')];

  const files600 = [path.join(ROOT_FOLDER, 'traefik', 'shared', 'acme.json')];

  // Give permission to read and write to all files and folders for the current user
  for (const fileOrFolder of filesAndFolders) {
    if (await pathExists(fileOrFolder)) {
      await execAsync(`chmod -R a+rwx ${fileOrFolder}`).catch(() => {});
    }
  }

  for (const fileOrFolder of files600) {
    if (await pathExists(fileOrFolder)) {
      await execAsync(`chmod 600 ${fileOrFolder}`).catch(() => {});
    }
  }
};
