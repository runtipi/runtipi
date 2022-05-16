import * as dotenv from 'dotenv';

interface IConfig {
  NODE_ENV: string;
  ROOT_FOLDER: string;
  JWT_SECRET: string;
  CLIENT_URLS: string[];
}

dotenv.config();

const { NODE_ENV = 'development', JWT_SECRET = '' } = process.env;

const config: IConfig = {
  NODE_ENV,
  ROOT_FOLDER: '/tipi',
  JWT_SECRET,
  CLIENT_URLS: ['http://locahost:3000', 'http://10.21.21.4', 'http://10.21.21.4:3000'],
};

export default config;
