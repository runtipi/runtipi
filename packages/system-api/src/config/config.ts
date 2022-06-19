import * as dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';
import App from '../modules/apps/app.entity';
import { __prod__ } from './constants/constants';

interface IConfig {
  logs: {
    LOGS_FOLDER: string;
    LOGS_APP: string;
    LOGS_ERROR: string;
  };
  typeorm: DataSourceOptions;
  NODE_ENV: string;
  ROOT_FOLDER: string;
  JWT_SECRET: string;
  CLIENT_URLS: string[];
  VERSION: string;
  ROOT_FOLDER_HOST: string;
}

dotenv.config();

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
  POSTGRES_DB = '',
  POSTGRES_USER = '',
  POSTGRES_PASSWORD = '',
} = process.env;

const config: IConfig = {
  logs: {
    LOGS_FOLDER,
    LOGS_APP,
    LOGS_ERROR,
  },
  typeorm: {
    type: 'postgres',
    host: 'postgres',
    database: POSTGRES_DB,
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    port: 5432,
    logging: !__prod__,
    synchronize: true,
    entities: [App],
  },
  NODE_ENV,
  ROOT_FOLDER: '/tipi',
  JWT_SECRET,
  CLIENT_URLS: ['http://localhost:3000', `http://${INTERNAL_IP}`, `http://${INTERNAL_IP}:${NGINX_PORT}`, `http://${INTERNAL_IP}:3000`],
  VERSION: TIPI_VERSION,
  ROOT_FOLDER_HOST,
};

export default config;
