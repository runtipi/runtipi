import * as dotenv from 'dotenv';

interface IConfig {
  NODE_ENV: string;
  ROOT_FOLDER: string;
  JWT_SECRET: string;
  CLIENT_URLS: string[];
  VERSION: string;
}

dotenv.config();

const { NODE_ENV = 'development', JWT_SECRET = '', INTERNAL_IP = '', TIPI_VERSION = '' } = process.env;

const config: IConfig = {
  NODE_ENV,
  ROOT_FOLDER: '/tipi',
  JWT_SECRET,
  CLIENT_URLS: ['http://localhost:3000', `http://${INTERNAL_IP}`, `http://${INTERNAL_IP}:3000`],
  VERSION: TIPI_VERSION,
};

export default config;
