import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'test-db',
  entities: ['src/modules/**/*.entity.ts'],
  migrations: ['src/config/migrations/*.ts'],
});
