import { DataSource } from 'typeorm';

export const connectionSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'postgres',
  logging: true,
  synchronize: false,
  entities: [process.cwd() + '/src/modules/**/*.entity.ts'],
  migrations: [process.cwd() + '/src/config/migrations/*.ts'],
});
