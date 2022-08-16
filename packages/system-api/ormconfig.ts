import { DataSource } from 'typeorm';

export const connectionSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'tipi',
  password: 'postgres',
  database: 'tipi',
  logging: true,
  synchronize: false,
  entities: ['src/modules/**/*.entity.ts'],
});
