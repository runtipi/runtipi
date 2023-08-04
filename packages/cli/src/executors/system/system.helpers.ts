import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { envMapToString, envStringToMap, settingsSchema } from '@runtipi/shared';
import { pathExists } from '@/utils/fs-helpers';
import { getRepoHash } from '../repo/repo.helpers';

const DEFAULT_REPO_URL = 'https://github.com/meienberger/runtipi-appstore';

/**
 * Reads and returns the generated seed
 */
const getSeed = async () => {
  const rootFolder = process.cwd();

  const seedFilePath = path.join(rootFolder, 'state', 'seed');

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
const generateSeed = async (rootFolder: string) => {
  if (!(await pathExists(path.join(rootFolder, 'state', 'seed')))) {
    const randomBytes = crypto.randomBytes(32);
    const seed = randomBytes.toString('hex');

    await fs.promises.writeFile(path.join(rootFolder, 'state', 'seed'), seed);
  }
};

/**
 * Will return the first internal IP address of the current system
 */
const getInternalIp = () => {
  const interfaces = os.networkInterfaces();

  for (let i = 0; i < Object.keys(interfaces).length; i += 1) {
    const devName = Object.keys(interfaces)[i];
    const iface = interfaces[devName || ''];

    const length = iface?.length || 0;
    for (let j = 0; j < length; j += 1) {
      const alias = iface?.[j];

      if (alias && alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) return alias.address;
    }
  }

  return '0.0.0.0';
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
  const rootFolder = process.cwd();
  await fs.promises.mkdir(path.join(rootFolder, 'state'), { recursive: true });
  const settingsFilePath = path.join(rootFolder, 'state', 'settings.json');
  const envFilePath = path.join(rootFolder, '.env');

  if (!(await pathExists(envFilePath))) {
    await fs.promises.writeFile(envFilePath, '');
  }

  const envFile = await fs.promises.readFile(envFilePath, 'utf-8');
  const envMap = envStringToMap(envFile);

  if (!(await pathExists(settingsFilePath))) {
    await fs.promises.writeFile(settingsFilePath, JSON.stringify({}));
  }

  const settingsFile = await fs.promises.readFile(settingsFilePath, 'utf-8');

  const settings = settingsSchema.safeParse(JSON.parse(settingsFile));

  if (!settings.success) {
    throw new Error(`Invalid settings.json file: ${settings.error.message}`);
  }

  await generateSeed(rootFolder);

  const { data } = settings;

  const jwtSecret = envMap.get('JWT_SECRET') || (await deriveEntropy('jwt_secret'));
  const repoId = getRepoHash(data.appsRepoUrl || DEFAULT_REPO_URL);
  const postgresPassword = envMap.get('POSTGRES_PASSWORD') || (await deriveEntropy('postgres_password'));

  const version = await fs.promises.readFile(path.join(rootFolder, 'VERSION'), 'utf-8');

  envMap.set('APPS_REPO_ID', repoId);
  envMap.set('APPS_REPO_URL', data.appsRepoUrl || DEFAULT_REPO_URL);
  envMap.set('TZ', Intl.DateTimeFormat().resolvedOptions().timeZone);
  envMap.set('INTERNAL_IP', data.listenIp || getInternalIp());
  envMap.set('DNS_IP', data.dnsIp || '9.9.9.9');
  envMap.set('ARCHITECTURE', getArchitecture());
  envMap.set('TIPI_VERSION', version);
  envMap.set('JWT_SECRET', jwtSecret);
  envMap.set('ROOT_FOLDER_HOST', rootFolder);
  envMap.set('NGINX_PORT', String(data.port || 80));
  envMap.set('NGINX_PORT_SSL', String(data.sslPort || 443));
  envMap.set('DOMAIN', data.domain || 'example.com');
  envMap.set('STORAGE_PATH', data.storagePath || rootFolder);
  envMap.set('POSTGRES_HOST', 'tipi-db');
  envMap.set('POSTGRES_DBNAME', 'tipi');
  envMap.set('POSTGRES_USERNAME', 'tipi');
  envMap.set('POSTGRES_PASSWORD', postgresPassword);
  envMap.set('POSTGRES_PORT', String(5432));
  envMap.set('REDIS_HOST', 'tipi-redis');
  envMap.set('DEMO_MODE', String(data.demoMode || 'false'));
  envMap.set('LOCAL_DOMAIN', data.localDomain || 'tipi.lan');

  await fs.promises.writeFile(envFilePath, envMapToString(envMap));
};

/**
 * Copies the system files from the assets folder to the current working directory
 */
export const copySystemFiles = async () => {
  const assetsFolder = path.join('/snapshot', 'runtipi', 'packages', 'cli', 'assets');

  // Copy docker-compose.yml file
  await fs.promises.copyFile(path.join(assetsFolder, 'docker-compose.yml'), path.join(process.cwd(), 'docker-compose.yml'));

  // Copy VERSION file
  await fs.promises.copyFile(path.join(assetsFolder, 'VERSION'), path.join(process.cwd(), 'VERSION'));

  // Copy traefik folder from assets
  await fs.promises.mkdir(path.join(process.cwd(), 'traefik', 'dynamic'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'traefik', 'shared'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'traefik', 'tls'), { recursive: true });

  await fs.promises.copyFile(path.join(assetsFolder, 'traefik', 'traefik.yml'), path.join(process.cwd(), 'traefik', 'traefik.yml'));
  await fs.promises.copyFile(path.join(assetsFolder, 'traefik', 'dynamic', 'dynamic.yml'), path.join(process.cwd(), 'traefik', 'dynamic', 'dynamic.yml'));

  // Create base folders
  await fs.promises.mkdir(path.join(process.cwd(), 'apps'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'app-data'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'state'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'repos'), { recursive: true });

  // Create media folders
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'torrents', 'watch'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'torrents', 'complete'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'torrents', 'incomplete'), { recursive: true });

  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'usenet', 'watch'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'usenet', 'complete'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'usenet', 'incomplete'), { recursive: true });

  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'downloads', 'watch'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'downloads', 'complete'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'downloads', 'incomplete'), { recursive: true });

  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'books'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'comics'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'movies'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'music'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'tv'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'podcasts'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'images'), { recursive: true });
  await fs.promises.mkdir(path.join(process.cwd(), 'media', 'data', 'roms'), { recursive: true });
};
