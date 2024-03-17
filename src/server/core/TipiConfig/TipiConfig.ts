import { z } from 'zod';
import { envSchema, envStringToMap, settingsSchema } from '@runtipi/shared';
import fs from 'fs';
import * as Sentry from '@sentry/nextjs';
import path from 'path';
import { DATA_DIR } from '../../../config';
import { readJsonFile } from '../../common/fs.helpers';
import { Logger } from '../Logger';

type TipiSettingsType = z.input<typeof settingsSchema>;

const formatErrors = (errors: { fieldErrors: Record<string, string[]> }) =>
  Object.entries(errors.fieldErrors)
    .map(([name, value]) => `${name}: ${value[0]}`)
    .filter(Boolean)
    .join('\n');

export class TipiConfigClass {
  private config: z.infer<typeof envSchema> = {} as z.infer<typeof envSchema>;

  private fileConfigCache: z.infer<typeof settingsSchema> | null;

  private cacheTime: number;

  private cacheTimeout: number;

  constructor(cacheTimeout = 5000) {
    this.fileConfigCache = null;
    this.cacheTime = 0;
    this.cacheTimeout = cacheTimeout;

    this.genConfig();
  }

  private async genConfig() {
    let envFile = '';
    try {
      envFile = await fs.promises.readFile(`${DATA_DIR}/.env`).then((s) => s.toString());
    } catch (e) {
      Sentry.captureException(e);
      Logger.error('❌ .env file not found');
    }

    const envMap = envStringToMap(envFile.toString());

    const conf = { ...process.env, ...Object.fromEntries(envMap) } as Record<string, string>;
    const envConfig = {
      architecture: conf.ARCHITECTURE || 'amd64',
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
      allowErrorMonitoring: conf.ALLOW_ERROR_MONITORING,
      allowAutoThemes: conf.ALLOW_AUTO_THEMES,
      seePreReleaseVersions: false,
    };

    const parsedConfig = envSchema.safeParse({ ...envConfig, ...this.getFileConfig() });
    if (parsedConfig.success) {
      this.config = parsedConfig.data;
    } else {
      const errors = formatErrors(parsedConfig.error.flatten());
      Sentry.captureException(new Error(`Invalid env config ${JSON.stringify(parsedConfig.error.flatten())}`));
      Logger.error(`❌ Invalid env config ${JSON.stringify(errors)}`);
    }
  }

  private getFileConfig() {
    const now = Date.now();

    let fileConfig = {};

    // Check if the cache is still valid (less than 5 second old)
    if (this.fileConfigCache && now - this.cacheTime < this.cacheTimeout) {
      fileConfig = this.fileConfigCache;
    } else {
      let rawFileConfig = '';

      try {
        const temp = fs.readFileSync(path.join(DATA_DIR, 'state', 'settings.json'), 'utf-8') || '{}';
        rawFileConfig = JSON.parse(temp) as string;
      } catch (e) {
        Sentry.captureException(e);
        rawFileConfig = '{}';
      }

      const parsedFileConfig = settingsSchema.safeParse(rawFileConfig);

      if (parsedFileConfig.success) {
        fileConfig = parsedFileConfig.data;
        this.fileConfigCache = fileConfig;
        this.cacheTime = Date.now();
      } else {
        Logger.error(`❌ Invalid settings.json file: ${JSON.stringify(parsedFileConfig.error.flatten())}`);
      }
    }

    return fileConfig;
  }

  public resetCache() {
    this.cacheTime = 0;
    this.fileConfigCache = null;
  }

  public getConfig() {
    return { ...this.config, ...this.getFileConfig() };
  }

  public getSettings() {
    try {
      const fileConfig = this.getFileConfig();
      return settingsSchema.parse({ ...this.config, ...fileConfig });
    } catch (e) {
      Sentry.captureException(e);
      return {};
    }
  }

  public async setConfig<T extends keyof typeof envSchema.shape>(key: T, value: z.infer<typeof envSchema>[T], writeFile = false) {
    const conf = this.getConfig();
    const newConf: z.infer<typeof envSchema> = { ...conf };
    newConf[key] = value;

    this.config = envSchema.parse(newConf);

    if (writeFile) {
      const currentJsonConf = (await readJsonFile(`${DATA_DIR}/state/settings.json`)) || {};
      const parsedConf = envSchema.partial().parse(currentJsonConf);

      parsedConf[key] = value;
      const parsed = envSchema.partial().parse(parsedConf);

      await fs.promises.writeFile(`${DATA_DIR}/state/settings.json`, JSON.stringify(parsed));
    }
  }

  public async setSettings(settings: TipiSettingsType) {
    if (this.config.demoMode) {
      throw new Error('Cannot update settings in demo mode');
    }

    const parsed = settingsSchema.safeParse(settings);

    if (!parsed.success) {
      Logger.error('❌ Invalid settings.json file');
      return;
    }

    await fs.promises.writeFile(`${DATA_DIR}/state/settings.json`, JSON.stringify(parsed.data));

    // Reset cache
    this.cacheTime = 0;
    this.fileConfigCache = null;

    this.config = envSchema.parse({ ...this.getConfig(), ...parsed.data });
  }
}

export const TipiConfig = new TipiConfigClass();
