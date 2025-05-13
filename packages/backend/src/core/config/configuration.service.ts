import fs from 'node:fs';
import path from 'node:path';
import { type PartialUserSettingsDto, settingsSchema } from '@/app.dto.js';
import { APP_DATA_DIR, APP_DIR, ARCHITECTURES, DATA_DIR } from '@/common/constants.js';
import { TranslatableError } from '@/common/error/translatable-error.js';
import { EnvUtils } from '@/modules/env/env.utils.js';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { LOG_LEVEL_ENUM, type LogLevel, LoggerService } from '../logger/logger.service.js';

const envSchema = z.object({
  POSTGRES_HOST: z.string(),
  POSTGRES_DBNAME: z.string(),
  POSTGRES_USERNAME: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_PORT: z.coerce.number().default(5432),
  RABBITMQ_HOST: z.string(),
  RABBITMQ_USERNAME: z.string(),
  RABBITMQ_PASSWORD: z.string(),
  ARCHITECTURE: z.enum(ARCHITECTURES).default('amd64'),
  INTERNAL_IP: z.string(),
  TIPI_VERSION: z.string(),
  JWT_SECRET: z.string(),
  APPS_REPO_ID: z.string(),
  APPS_REPO_URL: z.string(),
  DOMAIN: z.string(),
  LOCAL_DOMAIN: z.string(),
  DNS_IP: z.string().default('9.9.9.9'),
  RUNTIPI_APP_DATA_PATH: z.string(),
  RUNTIPI_FORWARD_AUTH_URL: z.string(),
  DEMO_MODE: z.string().transform((val) => val.toLowerCase() === 'true'),
  GUEST_DASHBOARD: z.string().transform((val) => val.toLowerCase() === 'true'),
  ALLOW_ERROR_MONITORING: z.string().transform((val) => val.toLowerCase() === 'true'),
  ALLOW_AUTO_THEMES: z.string().transform((val) => val.toLowerCase() === 'true'),
  PERSIST_TRAEFIK_CONFIG: z.string().transform((val) => val.toLowerCase() === 'true'),
  QUEUE_TIMEOUT_IN_MINUTES: z.coerce.number().default(5),
  LOG_LEVEL: z.nativeEnum(LOG_LEVEL_ENUM).default('info').catch('info'),
  TZ: z.string(),
  ROOT_FOLDER_HOST: z.string(),
  NGINX_PORT: z.coerce.number().default(80),
  NGINX_PORT_SSL: z.coerce.number().default(443),
  ADVANCED_SETTINGS: z.string().transform((val) => val.toLowerCase() === 'true'),
  THEME_BASE: z.string().optional(),
  THEME_COLOR: z.string().optional(),
  // Experimental flags
  EXPERIMENTAL_INSECURE_COOKIE: z.string().transform((val) => val.toLowerCase() === 'true'),
});

@Injectable()
export class ConfigurationService {
  private config: ReturnType<typeof this.configure>;
  private envPath = path.join(DATA_DIR, '.env');
  private logger: LoggerService;

  // Lowest level, cannot use any other service or module to avoid circular dependencies
  constructor(private readonly envUtils: EnvUtils) {
    dotenv.config({ path: this.envPath, override: true });
    this.logger = new LoggerService('backend', path.join(DATA_DIR, 'logs'), process.env.LOG_LEVEL as LogLevel);
    this.config = this.configure();
  }

  private getEnvMap() {
    let envFile = '';
    try {
      envFile = fs.readFileSync(this.envPath).toString();
    } catch (e) {
      this.logger.error('❌ .env file not found');
    }

    return this.envUtils.envStringToMap(envFile.toString());
  }

  private configure() {
    const envMap = this.getEnvMap();
    const conf = { ...Object.fromEntries(envMap), ...process.env } as Record<string, string>;

    const env = envSchema.safeParse(conf);

    if (!env.success) {
      this.logger.error(env.error.errors);
      throw new Error(`❌ Invalid environment variables ${JSON.stringify(env.error.flatten(), null, 2)}`);
    }

    this.logger = new LoggerService('backend', path.join(DATA_DIR, 'logs'), env.data.LOG_LEVEL);

    return {
      database: {
        host: env.data.POSTGRES_HOST,
        port: env.data.POSTGRES_PORT,
        username: env.data.POSTGRES_USERNAME,
        password: env.data.POSTGRES_PASSWORD,
        database: env.data.POSTGRES_DBNAME,
      },
      queue: {
        host: env.data.RABBITMQ_HOST,
        username: env.data.RABBITMQ_USERNAME,
        password: env.data.RABBITMQ_PASSWORD,
      },
      directories: {
        dataDir: DATA_DIR,
        appDataDir: APP_DATA_DIR,
        appDir: APP_DIR,
      },
      logLevel: env.data.LOG_LEVEL,
      version: env.data.TIPI_VERSION,
      isProduction: process.env.NODE_ENV === 'production',
      userSettings: {
        allowAutoThemes: env.data.ALLOW_AUTO_THEMES,
        allowErrorMonitoring: env.data.ALLOW_ERROR_MONITORING && process.env.NODE_ENV === 'production',
        demoMode: env.data.DEMO_MODE,
        guestDashboard: env.data.GUEST_DASHBOARD,
        timeZone: env.data.TZ,
        domain: env.data.DOMAIN,
        localDomain: env.data.LOCAL_DOMAIN,
        port: env.data.NGINX_PORT || 80,
        sslPort: env.data.NGINX_PORT_SSL || 443,
        listenIp: env.data.INTERNAL_IP, // TODO: Check if this is correct
        internalIp: env.data.INTERNAL_IP,
        appsRepoUrl: env.data.APPS_REPO_URL,
        postgresPort: env.data.POSTGRES_PORT,
        dnsIp: env.data.DNS_IP,
        appDataPath: env.data.RUNTIPI_APP_DATA_PATH,
        forwardAuthUrl: env.data.RUNTIPI_FORWARD_AUTH_URL,
        persistTraefikConfig: env.data.PERSIST_TRAEFIK_CONFIG,
        eventsTimeout: env.data.QUEUE_TIMEOUT_IN_MINUTES,
        advancedSettings: env.data.ADVANCED_SETTINGS,
        logLevel: env.data.LOG_LEVEL,
        themeBase: env.data.THEME_BASE || 'gray',
        themeColor: env.data.THEME_COLOR || 'blue',
        experimental: {
          insecureCookie: env.data.EXPERIMENTAL_INSECURE_COOKIE,
        },
      },
      deprecatedAppsRepoId: env.data.APPS_REPO_ID, // @deprecated
      deprecatedAppsRepoUrl: env.data.APPS_REPO_URL, // @deprecated
      architecture: env.data.ARCHITECTURE,
      demoMode: env.data.DEMO_MODE,
      rootFolderHost: env.data.ROOT_FOLDER_HOST,
      envFilePath: this.envPath,
      internalIp: env.data.INTERNAL_IP,
      jwtSecret: env.data.JWT_SECRET,
      __prod__: process.env.NODE_ENV === 'production',
    };
  }

  public getConfig() {
    return this.config;
  }

  public get<T extends keyof ReturnType<typeof this.configure>>(key: T) {
    return this.config[key];
  }

  public async setUserSettings(settings: PartialUserSettingsDto) {
    if (this.config.demoMode) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    try {
      this.initSentry({ release: this.config.version, allowSentry: Boolean(settings.allowErrorMonitoring) });

      const settingsPath = path.join(DATA_DIR, 'state', 'settings.json');

      const fileContent = await fs.promises.readFile(settingsPath, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      const currentSettings = settingsSchema.partial().parse(parsedContent);

      await fs.promises.writeFile(settingsPath, `${JSON.stringify({ ...currentSettings, ...settings }, null, 2)}`, 'utf8');
      this.config.userSettings = { ...this.config.userSettings, ...settings };
    } catch (error) {
      this.logger.error('Failed to set user settings', error);
      throw new InternalServerErrorException('Failed to set user settings');
    }
  }

  public async initSentry(params: { release: string; allowSentry: boolean }) {
    const { allowSentry } = params;

    const client = Sentry.getClient();

    if (!client) {
      return;
    }

    if (allowSentry) {
      client.getOptions().enabled = true;
    } else {
      await client.close();
    }
  }
}
