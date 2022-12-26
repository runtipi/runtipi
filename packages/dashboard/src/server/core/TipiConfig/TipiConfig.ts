import { z } from 'zod';
import fs from 'fs-extra';
import nextConfig from 'next/config';
import { readJsonFile } from '../../common/fs.helpers';
import { Logger } from '../Logger';

enum AppSupportedArchitecturesEnum {
  ARM = 'arm',
  ARM64 = 'arm64',
  AMD64 = 'amd64',
}

const { serverRuntimeConfig } = nextConfig();
const {
  LOGS_FOLDER = '/app/logs',
  LOGS_APP = 'app.log',
  LOGS_ERROR = 'error.log',
  NODE_ENV,
  JWT_SECRET,
  INTERNAL_IP,
  TIPI_VERSION,
  APPS_REPO_ID,
  APPS_REPO_URL,
  DOMAIN,
  REDIS_HOST,
  STORAGE_PATH = '/runtipi',
  ARCHITECTURE = 'amd64',
} = serverRuntimeConfig;

const configSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]),
  REDIS_HOST: z.string(),
  status: z.union([z.literal('RUNNING'), z.literal('UPDATING'), z.literal('RESTARTING')]),
  architecture: z.nativeEnum(AppSupportedArchitecturesEnum),
  logs: z.object({
    LOGS_FOLDER: z.string(),
    LOGS_APP: z.string(),
    LOGS_ERROR: z.string(),
  }),
  dnsIp: z.string(),
  rootFolder: z.string(),
  internalIp: z.string(),
  version: z.string(),
  jwtSecret: z.string(),
  appsRepoId: z.string(),
  appsRepoUrl: z.string(),
  domain: z.string(),
  storagePath: z.string(),
});

export const formatErrors = (errors: z.ZodFormattedError<Map<string, string>, string>) =>
  Object.entries(errors)
    .map(([name, value]) => {
      if (value && '_errors' in value) return `${name}: ${value._errors.join(', ')}\n`;
      return null;
    })
    .filter(Boolean)
    .join('\n');

export class TipiConfig {
  private static instance: TipiConfig;

  private config: z.infer<typeof configSchema>;

  constructor() {
    const envConfig: z.infer<typeof configSchema> = {
      logs: {
        LOGS_FOLDER,
        LOGS_APP,
        LOGS_ERROR,
      },
      REDIS_HOST,
      NODE_ENV,
      architecture: ARCHITECTURE as z.infer<typeof configSchema>['architecture'],
      rootFolder: '/runtipi',
      internalIp: INTERNAL_IP,
      version: TIPI_VERSION,
      jwtSecret: JWT_SECRET,
      appsRepoId: APPS_REPO_ID,
      appsRepoUrl: APPS_REPO_URL,
      domain: DOMAIN,
      dnsIp: '9.9.9.9',
      status: 'RUNNING',
      storagePath: STORAGE_PATH,
    };

    const fileConfig = readJsonFile('/runtipi/state/settings.json') || {};
    const parsedFileConfig = configSchema.partial().safeParse(fileConfig);

    if (parsedFileConfig.success) {
      const parsedConfig = configSchema.safeParse({ ...envConfig, ...parsedFileConfig.data });
      if (parsedConfig.success) {
        this.config = parsedConfig.data;
      } else {
        Logger.error(`❌ Invalid env config\n${formatErrors(parsedConfig.error.format())}`);
        throw new Error('Invalid env config');
      }
    } else {
      Logger.error(`❌ Invalid settings.json file:\n${formatErrors(parsedFileConfig.error.format())}`);
      throw new Error('Invalid settings.json file');
    }
  }

  public static getInstance(): TipiConfig {
    if (!TipiConfig.instance) {
      TipiConfig.instance = new TipiConfig();
    }
    return TipiConfig.instance;
  }

  public getConfig() {
    return this.config;
  }

  public setConfig<T extends keyof typeof configSchema.shape>(key: T, value: z.infer<typeof configSchema>[T], writeFile = false) {
    const newConf: z.infer<typeof configSchema> = { ...this.getConfig() };
    newConf[key] = value;

    this.config = configSchema.parse(newConf);

    if (writeFile) {
      const currentJsonConf = readJsonFile('/runtipi/state/settings.json') || {};
      const parsedConf = configSchema.partial().parse(currentJsonConf);

      parsedConf[key] = value;
      const parsed = configSchema.partial().parse(parsedConf);

      fs.writeFileSync('/runtipi/state/settings.json', JSON.stringify(parsed));
    }
  }
}

export const setConfig = <T extends keyof typeof configSchema.shape>(key: T, value: z.infer<typeof configSchema>[T], writeFile = false) => {
  TipiConfig.getInstance().setConfig(key, value, writeFile);
};

export const getConfig = () => TipiConfig.getInstance().getConfig();
