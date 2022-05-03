import * as dotenv from 'dotenv';

interface IConfig {
  NODE_ENV: string;
  ROOT_FOLDER: string;
  JWT_SECRET: string;
}

dotenv.config();

const { NODE_ENV = 'development', ROOT_FOLDER = '', JWT_SECRET = '' } = process.env;

const missing = [];

if (!ROOT_FOLDER) missing.push('ROOT_FOLDER');

if (missing.length > 0) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const config: IConfig = {
  NODE_ENV,
  ROOT_FOLDER,
  JWT_SECRET,
};

export default config;
