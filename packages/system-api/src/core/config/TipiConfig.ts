import { z } from 'zod';
import * as dotenv from 'dotenv';
import fs from 'fs-extra';
import { readJsonFile } from '../../modules/fs/fs.helpers';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.dev' });
} else {
  dotenv.config({ path: '.env' });
}
const {
  LOGS_FOLDER = 'logs',
  LOGS_APP = 'app.log',
  LOGS_ERROR = 'error.log',
  NODE_ENV = 'development',
  JWT_SECRET = '',
  INTERNAL_IP = '',
  TIPI_VERSION = '',
  NGINX_PORT = '80',
  APPS_REPO_ID = '',
  APPS_REPO_URL = '',
  DOMAIN = '',
} = process.env;

const configSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]),
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
  clientUrls: z.array(z.string()),
  appsRepoId: z.string(),
  appsRepoUrl: z.string(),
  domain: z.string(),
});

class Config {
  private static instance: Config;

  private config: z.infer<typeof configSchema>;

  constructor() {
    const envConfig: z.infer<typeof configSchema> = {
      logs: {
        LOGS_FOLDER,
        LOGS_APP,
        LOGS_ERROR,
      },
      NODE_ENV: NODE_ENV as z.infer<typeof configSchema>['NODE_ENV'],
      rootFolder: '/runtipi',
      internalIp: INTERNAL_IP,
      version: TIPI_VERSION,
      jwtSecret: JWT_SECRET,
      clientUrls: ['http://localhost:3000', `http://${INTERNAL_IP}`, `http://${INTERNAL_IP}:${NGINX_PORT}`, `http://${INTERNAL_IP}:3000`, DOMAIN && `https://${DOMAIN}`].filter(Boolean),
      appsRepoId: APPS_REPO_ID,
      appsRepoUrl: APPS_REPO_URL,
      domain: DOMAIN,
      dnsIp: '9.9.9.9',
    };

    const parsed = configSchema.parse({
      ...envConfig,
    });

    this.config = parsed;
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public getConfig() {
    return this.config;
  }

  public applyJsonConfig() {
    const fileConfig = readJsonFile('/state/settings.json');

    const parsed = configSchema.parse({
      ...this.config,
      ...fileConfig,
    });

    this.config = parsed;
  }

  public setConfig(key: keyof typeof configSchema.shape, value: any) {
    const newConf = { ...this.getConfig() };
    newConf[key] = value;

    this.config = configSchema.parse(newConf);

    fs.writeFileSync(`${this.config.rootFolder}/state/settings.json`, JSON.stringify(newConf));
  }
}

export const setConfig = (key: keyof typeof configSchema.shape, value: any) => {
  Config.getInstance().setConfig(key, value);
};

export const getConfig = () => Config.getInstance().getConfig();

export const applyJsonConfig = () => Config.getInstance().applyJsonConfig();
