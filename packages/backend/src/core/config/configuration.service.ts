import fs from 'node:fs';
import path from 'node:path';
import { type PartialUserSettingsDto, settingsSchema } from '@/app.dto';
import { APP_DATA_DIR, APP_DIR, ARCHITECTURES, DATA_DIR } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
import { cleanseErrorData } from '@/common/helpers/error-helpers';
import { EnvUtils } from '@/modules/env/env.utils';
import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { FilesystemService } from '../filesystem/filesystem.service';

const envSchema = z.object({
  POSTGRES_HOST: z.string(),
  POSTGRES_DBNAME: z.string(),
  POSTGRES_USERNAME: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_PORT: z.string().transform(Number),
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
  DEMO_MODE: z.string().transform((val) => val.toLowerCase() === 'true'),
  GUEST_DASHBOARD: z.string().transform((val) => val.toLowerCase() === 'true'),
  ALLOW_ERROR_MONITORING: z.string().transform((val) => val.toLowerCase() === 'true'),
  ALLOW_AUTO_THEMES: z.string().transform((val) => val.toLowerCase() === 'true'),
  PERSIST_TRAEFIK_CONFIG: z.string().transform((val) => val.toLowerCase() === 'true'),
  LOG_LEVEL: z.string().default('info'),
  TZ: z.string(),
  ROOT_FOLDER_HOST: z.string(),
  NGINX_PORT: z.string().default('80').transform(Number),
  NGINX_PORT_SSL: z.string().default('443').transform(Number),
});

@Injectable()
export class ConfigurationService {
  private config: ReturnType<typeof this.configure>;
  private envPath = path.join(DATA_DIR, '.env');

  // Lowest level, cannot use any other service or module to avoid circular dependencies
  constructor(
    private readonly envUtils: EnvUtils,
    private readonly filesystem: FilesystemService,
  ) {
    dotenv.config({ path: this.envPath, override: true });
    this.config = this.configure();
  }

  private configure() {
    let envFile = '';
    try {
      envFile = fs.readFileSync(this.envPath).toString();
    } catch (e) {
      console.error('❌ .env file not found');
    }

    const envMap = this.envUtils.envStringToMap(envFile.toString());
    const conf = { ...Object.fromEntries(envMap), ...process.env } as Record<string, string>;

    const env = envSchema.safeParse(conf);

    if (!env.success) {
      console.error(env.error.errors);
      throw new Error(`❌ Invalid environment variables ${JSON.stringify(env.error.flatten(), null, 2)}`);
    }

    return {
      database: {
        host: env.data.POSTGRES_HOST,
        port: env.data.POSTGRES_PORT,
        username: env.data.POSTGRES_USERNAME,
        password: env.data.POSTGRES_PASSWORD,
        database: env.data.POSTGRES_DBNAME,
      },
      directories: {
        dataDir: DATA_DIR,
        appDataDir: APP_DATA_DIR,
        appDir: APP_DIR,
      },
      logLevel: env.data.LOG_LEVEL,
      version: env.data.TIPI_VERSION,
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
        appDataPath: path.join(env.data.RUNTIPI_APP_DATA_PATH, 'app-data'),
        persistTraefikConfig: env.data.PERSIST_TRAEFIK_CONFIG,
      },
      deprecatedAppsRepoId: env.data.APPS_REPO_ID, // @deprecated
      deprecatedAppsRepoUrl: env.data.APPS_REPO_URL, // @deprecated
      architecture: env.data.ARCHITECTURE,
      demoMode: env.data.DEMO_MODE,
      rootFolderHost: env.data.ROOT_FOLDER_HOST,
      envFilePath: this.envPath,
      internalIp: env.data.INTERNAL_IP,
      jwtSecret: env.data.JWT_SECRET,
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

    if (settings.allowErrorMonitoring) {
      this.initSentry({ release: this.config.version, allowSentry: settings.allowErrorMonitoring });
    }

    const settingsPath = path.join(DATA_DIR, 'state', 'settings.json');

    const currentSettings = await this.filesystem.readJsonFile(settingsPath, settingsSchema.partial());

    await this.filesystem.writeJsonFile(settingsPath, {
      ...currentSettings,
      ...settings,
    });

    this.config.userSettings = {
      ...this.config.userSettings,
      ...settings,
    };
  }

  public async initSentry(params: { release: string; allowSentry: boolean }) {
    const { release, allowSentry } = params;

    if (allowSentry) {
      Sentry.init({
        release,
        dsn: 'https://6cc88df40d1cdd0222ff30d996ca457c@o4504242900238336.ingest.us.sentry.io/4508264534835200',
        environment: process.env.NODE_ENV,
        beforeSend: cleanseErrorData,
        includeLocalVariables: true,
        integrations: [],
        initialScope: {
          tags: { version: release },
        },
      });
    }
  }
}
