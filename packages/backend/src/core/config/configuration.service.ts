import fs from 'node:fs';
import path from 'node:path';
import { type UserSettingsBody, settingsSchema } from '@/app.dto';
import { APP_DATA_DIR, APP_DIR, ARCHITECTURES, DATA_DIR } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
import { EnvUtils } from '@/modules/env/env.utils';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { type } from 'arktype';
import dotenv from 'dotenv';
import validator from 'validator';
import { LOG_LEVEL_ENUM, type LogLevel, LoggerService } from '../logger/logger.service';

const envSchema = type({
  POSTGRES_HOST: 'string',
  POSTGRES_DBNAME: 'string',
  POSTGRES_USERNAME: 'string',
  POSTGRES_PASSWORD: 'string',
  POSTGRES_PORT: type('number | string.numeric.parse').default(5432),
  RABBITMQ_HOST: 'string',
  RABBITMQ_USERNAME: 'string',
  RABBITMQ_PASSWORD: 'string',
  ARCHITECTURE: type.enumerated(...ARCHITECTURES).default('amd64'),
  INTERNAL_IP: 'string',
  TIPI_VERSION: 'string',
  JWT_SECRET: 'string',
  APPS_REPO_ID: 'string',
  APPS_REPO_URL: 'string',
  DOMAIN: 'string',
  LOCAL_DOMAIN: 'string',
  DNS_IP: 'string = "9.9.9.9"',
  RUNTIPI_APP_DATA_PATH: 'string',
  RUNTIPI_FORWARD_AUTH_URL: 'string',
  DEMO_MODE: 'string',
  GUEST_DASHBOARD: 'string',
  ALLOW_ERROR_MONITORING: 'string',
  ALLOW_AUTO_THEMES: 'string',
  PERSIST_TRAEFIK_CONFIG: 'string',
  RUNTIPI_TRUSTED_PROXY_IPS: 'string = ""',
  QUEUE_TIMEOUT_IN_MINUTES: type('number | string.numeric.parse').default(5),
  LOG_LEVEL: 'string = "info"',
  TZ: 'string',
  ROOT_FOLDER_HOST: 'string',
  NGINX_PORT: type('number | string.numeric.parse').default(80),
  NGINX_PORT_SSL: type('number | string.numeric.parse').default(443),
  ADVANCED_SETTINGS: 'string',
  THEME_BASE: 'string',
  THEME_COLOR: 'string',
  MAX_BACKUPS: type('number | string.numeric.parse').default(0),
  // Experimental flags
  EXPERIMENTAL_INSECURE_COOKIE: 'string',
});

export const isValidIpOrCidr = (value: string) => {
  return validator.isIP(value) || validator.isIPRange(value);
};

export const parseTrustedProxyIps = (value: string) => {
  const trustedProxyIps: string[] = [];
  const invalidProxyIps: string[] = [];

  for (const token of value.split(',')) {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      continue;
    }

    if (isValidIpOrCidr(trimmedToken)) {
      trustedProxyIps.push(trimmedToken);
    } else {
      invalidProxyIps.push(trimmedToken);
    }
  }

  return { trustedProxyIps, invalidProxyIps };
};

@Injectable()
export class ConfigurationService {
  private config: ReturnType<typeof this.configure>;
  private envPath = path.join(DATA_DIR, '.env');
  private logger: LoggerService;

  // Lowest level, cannot use any other service or module to avoid circular dependencies
  constructor(private readonly envUtils: EnvUtils) {
    dotenv.config({ path: this.envPath, override: true, quiet: true });
    this.logger = new LoggerService('backend', path.join(DATA_DIR, 'logs'), process.env.LOG_LEVEL as LogLevel);
    this.config = this.configure();
  }

  private getEnvMap() {
    let envFile = '';
    try {
      envFile = fs.readFileSync(this.envPath).toString();
    } catch (_) {
      this.logger.error('❌ .env file not found');
    }

    return this.envUtils.envStringToMap(envFile.toString());
  }

  private configure() {
    const envMap = this.getEnvMap();
    const conf = { ...Object.fromEntries(envMap), ...process.env } as Record<string, string>;

    const env = envSchema(conf);
    if (env instanceof type.errors) {
      this.logger.error(env);
      throw new Error(`❌ Invalid environment variables ${JSON.stringify(env, null, 2)}`);
    }

    const logLevel = (Object.values(LOG_LEVEL_ENUM) as string[]).includes(env.LOG_LEVEL) ? (env.LOG_LEVEL as LogLevel) : 'info';
    this.logger = new LoggerService('backend', path.join(DATA_DIR, 'logs'), logLevel);

    const { NODE_ENV } = process.env;
    const { trustedProxyIps, invalidProxyIps } = parseTrustedProxyIps(env.RUNTIPI_TRUSTED_PROXY_IPS);
    if (invalidProxyIps.length) {
      this.logger.warn('Dropped invalid RUNTIPI_TRUSTED_PROXY_IPS entries', invalidProxyIps);
    }

    return {
      database: {
        host: env.POSTGRES_HOST,
        port: env.POSTGRES_PORT,
        username: env.POSTGRES_USERNAME,
        password: env.POSTGRES_PASSWORD,
        database: env.POSTGRES_DBNAME,
      },
      queue: {
        host: env.RABBITMQ_HOST,
        username: env.RABBITMQ_USERNAME,
        password: env.RABBITMQ_PASSWORD,
      },
      directories: {
        dataDir: DATA_DIR,
        appDataDir: APP_DATA_DIR,
        appDir: APP_DIR,
      },
      logLevel,
      version: env.TIPI_VERSION,
      isProduction: NODE_ENV === 'production',
      userSettings: {
        allowAutoThemes: env.ALLOW_AUTO_THEMES.toLowerCase() === 'true',
        allowErrorMonitoring: env.ALLOW_ERROR_MONITORING.toLowerCase() === 'true' && NODE_ENV === 'production',
        demoMode: env.DEMO_MODE.toLowerCase() === 'true',
        guestDashboard: env.GUEST_DASHBOARD.toLowerCase() === 'true',
        timeZone: env.TZ,
        domain: env.DOMAIN,
        localDomain: env.LOCAL_DOMAIN,
        port: env.NGINX_PORT || 80,
        sslPort: env.NGINX_PORT_SSL || 443,
        listenIp: env.INTERNAL_IP, // TODO: Check if this is correct
        internalIp: env.INTERNAL_IP,
        appsRepoUrl: env.APPS_REPO_URL,
        postgresPort: env.POSTGRES_PORT,
        dnsIp: env.DNS_IP,
        appDataPath: env.RUNTIPI_APP_DATA_PATH,
        forwardAuthUrl: env.RUNTIPI_FORWARD_AUTH_URL,
        persistTraefikConfig: env.PERSIST_TRAEFIK_CONFIG.toLowerCase() === 'true',
        eventsTimeout: env.QUEUE_TIMEOUT_IN_MINUTES,
        advancedSettings: env.ADVANCED_SETTINGS.toLowerCase() === 'true',
        logLevel,
        maxBackups: env.MAX_BACKUPS,
        themeBase: env.THEME_BASE,
        themeColor: env.THEME_COLOR,
        experimental: {
          insecureCookie: env.EXPERIMENTAL_INSECURE_COOKIE.toLowerCase() === 'true',
        },
      },
      traefik: {
        trustedProxyIps,
      },
      deprecatedAppsRepoId: env.APPS_REPO_ID, // @deprecated
      deprecatedAppsRepoUrl: env.APPS_REPO_URL, // @deprecated
      architecture: env.ARCHITECTURE,
      demoMode: env.DEMO_MODE.toLowerCase() === 'true',
      rootFolderHost: env.ROOT_FOLDER_HOST,
      envFilePath: this.envPath,
      internalIp: env.INTERNAL_IP,
      jwtSecret: env.JWT_SECRET,
      __prod__: NODE_ENV === 'production',
    };
  }

  public getConfig() {
    return this.config;
  }

  public get<T extends keyof ReturnType<typeof this.configure>>(key: T) {
    return this.config[key];
  }

  public async setUserSettings(settings: UserSettingsBody) {
    if (this.config.demoMode) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    try {
      this.initSentry({ release: this.config.version, allowSentry: Boolean(settings.allowErrorMonitoring) });

      const settingsPath = path.join(DATA_DIR, 'state', 'settings.json');

      const fileContent = await fs.promises.readFile(settingsPath, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      const currentSettingsResult = settingsSchema.partial()(parsedContent);
      if (currentSettingsResult instanceof type.errors) {
        throw currentSettingsResult.summary;
      }
      const currentSettings = currentSettingsResult;

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
