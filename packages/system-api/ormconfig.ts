import { DataSource } from 'typeorm';

export const connectionSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'tipi',
  password: 'postgres',
  database: 'postgres',
  logging: true,
  synchronize: false,
  entities: ['/src/modules/**/*.entity.ts'],
  migrations: ['/src/config/migrations/*.ts'],
});
