import * as dotenv from 'dotenv';

interface IConfig {
  logs: {
    LOGS_FOLDER: string;
    LOGS_APP: string;
    LOGS_ERROR: string;
  };
  NODE_ENV: string;
  ROOT_FOLDER: string;
  JWT_SECRET: string;
  CLIENT_URLS: string[];
  VERSION: string;
  ROOT_FOLDER_HOST: string;
  APPS_REPOSITORY: string;
}

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
  ROOT_FOLDER_HOST = '',
  NGINX_PORT = '80',
  APPS_REPOSITORY = '',
} = process.env;

const config: IConfig = {
  logs: {
    LOGS_FOLDER,
    LOGS_APP,
    LOGS_ERROR,
  },
  NODE_ENV,
  ROOT_FOLDER: '/tipi',
  JWT_SECRET,
  CLIENT_URLS: ['http://localhost:3000', `http://${INTERNAL_IP}`, `http://${INTERNAL_IP}:${NGINX_PORT}`, `http://${INTERNAL_IP}:3000`],
  VERSION: TIPI_VERSION,
  ROOT_FOLDER_HOST,
  APPS_REPOSITORY,
};

export default config;
