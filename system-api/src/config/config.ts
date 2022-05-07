import * as dotenv from 'dotenv';

interface IConfig {
  NODE_ENV: string;
  ROOT_FOLDER: string;
  JWT_SECRET: string;
  CLIENT_URLS: string[];
}

dotenv.config();

const { NODE_ENV = 'development', ROOT_FOLDER = '', JWT_SECRET = '', INTERNAL_IP = '' } = process.env;

const missing = [];

if (!ROOT_FOLDER) missing.push('ROOT_FOLDER');

if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const config: IConfig = {
  NODE_ENV,
  ROOT_FOLDER,
  JWT_SECRET,
  CLIENT_URLS: ['locahost:3000', `${INTERNAL_IP}`, `${INTERNAL_IP}:3000`],
};

export default config;
