import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import App from '../modules/apps/app.entity';
import User from '../modules/auth/user.entity';
import { __prod__ } from './constants/constants';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.dev' });
} else {
  dotenv.config({ path: '.env' });
}
const { POSTGRES_DBNAME = '', POSTGRES_HOST = '', POSTGRES_USERNAME = '', POSTGRES_PASSWORD = '' } = process.env;

console.log('PRODUCTION =>', __prod__);

export default new DataSource({
  type: 'postgres',
  host: POSTGRES_HOST,
  database: POSTGRES_DBNAME,
  username: POSTGRES_USERNAME,
  password: POSTGRES_PASSWORD,
  port: 5432,
  logging: !__prod__,
  synchronize: !__prod__,
  entities: [App, User],
  migrations: [process.cwd() + '/dist/config/migrations/*.js'],
});
