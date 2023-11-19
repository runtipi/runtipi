import { z } from 'zod';
import { envSchema, envStringToMap, settingsSchema } from '@runtipi/shared';
import fs from 'fs-extra';
import nextConfig from 'next/config';
import { readJsonFile } from '../../common/fs.helpers';
import { Logger } from '../Logger';

type TipiSettingsType = z.input<typeof settingsSchema>;

const formatErrors = (errors: { fieldErrors: Record<string, string[]> }) =>
  Object.entries(errors.fieldErrors)
    .map(([name, value]) => `${name}: ${value[0]}`)
    .filter(Boolean)
    .join('\n');

export class TipiConfig {
  private static instance: TipiConfig;

  private config: z.infer<typeof envSchema> = {} as z.infer<typeof envSchema>;

  constructor() {
    let envFile = '';
    try {
      envFile = fs.readFileSync('/runtipi/.env').toString();
    } catch (e) {
      Logger.error('❌ .env file not found');
    }

    const envMap = envStringToMap(envFile.toString());

    const conf = { ...process.env, ...Object.fromEntries(envMap), ...nextConfig().serverRuntimeConfig };
    const envConfig: z.input<typeof envSchema> = {
      postgresHost: conf.POSTGRES_HOST,
      postgresDatabase: conf.POSTGRES_DBNAME,
      postgresUsername: conf.POSTGRES_USERNAME,
      postgresPassword: conf.POSTGRES_PASSWORD,
      postgresPort: Number(conf.POSTGRES_PORT),
      REDIS_HOST: conf.REDIS_HOST,
      redisPassword: conf.REDIS_PASSWORD,
      NODE_ENV: conf.NODE_ENV,
      architecture: conf.ARCHITECTURE || 'amd64',
      rootFolder: '/runtipi',
      internalIp: conf.INTERNAL_IP,
      version: conf.TIPI_VERSION,
      jwtSecret: conf.JWT_SECRET,
      appsRepoId: conf.APPS_REPO_ID,
      appsRepoUrl: conf.APPS_REPO_URL,
      domain: conf.DOMAIN,
      localDomain: conf.LOCAL_DOMAIN,
      dnsIp: conf.DNS_IP || '9.9.9.9',
      storagePath: conf.STORAGE_PATH,
      demoMode: conf.DEMO_MODE,
      guestDashboard: conf.GUEST_DASHBOARD,
      seePreReleaseVersions: false,
    };

    const parsedConfig = envSchema.safeParse({ ...envConfig, ...this.getFileConfig() });
    if (parsedConfig.success) {
      this.config = parsedConfig.data;
    } else {
      const errors = formatErrors(parsedConfig.error.flatten());
      Logger.error(`❌ Invalid env config ${JSON.stringify(errors)}`);
    }
  }

  private getFileConfig() {
    const fileConfig = readJsonFile('/runtipi/state/settings.json') || {};
    const parsedFileConfig = envSchema.partial().safeParse(fileConfig);

    if (parsedFileConfig.success) {
      return parsedFileConfig.data;
    }

    Logger.error(`❌ Invalid settings.json file: ${JSON.stringify(parsedFileConfig.error.flatten())}`);

    return {};
  }

  public static getInstance(): TipiConfig {
    if (!TipiConfig.instance) {
      TipiConfig.instance = new TipiConfig();
    }
    return TipiConfig.instance;
  }

  public getConfig() {
    let conf = { ...this.config, ...this.getFileConfig() };

    // If we are not in test mode, we need to set the postgres port to 5432 (internal port)
    if (conf.NODE_ENV !== 'test') {
      conf = { ...conf, postgresPort: 5432 };
    }

    return conf;
  }

  public getSettings() {
    const fileConfig = readJsonFile('/runtipi/state/settings.json') || {};
    const parsedSettings = settingsSchema.safeParse({ ...this.config, ...fileConfig });

    if (parsedSettings.success) {
      return parsedSettings.data;
    }

    Logger.error('❌ Invalid settings.json file');
    return this.config;
  }

  public async setConfig<T extends keyof typeof envSchema.shape>(key: T, value: z.infer<typeof envSchema>[T], writeFile = false) {
    const newConf: z.infer<typeof envSchema> = { ...this.getConfig() };
    newConf[key] = value;

    this.config = envSchema.parse(newConf);

    if (writeFile) {
      const currentJsonConf = readJsonFile('/runtipi/state/settings.json') || {};
      const parsedConf = envSchema.partial().parse(currentJsonConf);

      parsedConf[key] = value;
      const parsed = envSchema.partial().parse(parsedConf);

      await fs.promises.writeFile('/runtipi/state/settings.json', JSON.stringify(parsed));
    }
  }

  public async setSettings(settings: TipiSettingsType) {
    if (this.config.demoMode) {
      throw new Error('Cannot update settings in demo mode');
    }

    const newConf: z.infer<typeof envSchema> = { ...this.getConfig() };
    const parsed = settingsSchema.safeParse(settings);

    if (!parsed.success) {
      Logger.error('❌ Invalid settings.json file');
      return;
    }

    await fs.promises.writeFile('/runtipi/state/settings.json', JSON.stringify(parsed.data));

    this.config = envSchema.parse({ ...newConf, ...parsed.data });
  }
}

export const setConfig = <T extends keyof typeof envSchema.shape>(key: T, value: z.infer<typeof envSchema>[T], writeFile = false) => {
  return TipiConfig.getInstance().setConfig(key, value, writeFile);
};

export const getConfig = () => TipiConfig.getInstance().getConfig();
export const getSettings = () => TipiConfig.getInstance().getSettings();
export const setSettings = (settings: TipiSettingsType) => TipiConfig.getInstance().setSettings(settings);
