import { BaseEntity, DataSource, DeepPartial } from 'typeorm';
import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import User from '../../modules/auth/user.entity';
import Update from '../../modules/system/update.entity';

const createUser = async (user: DeepPartial<BaseEntity>): Promise<void> => {
  await User.create(user).save();
};

const createApp = async (app: DeepPartial<BaseEntity>): Promise<void> => {
  await App.create(app).save();
};

const createUpdate = async (update: DeepPartial<BaseEntity>): Promise<void> => {
  await Update.create(update).save();
};

const recover = async (datasource: DataSource) => {
  logger.info('Recovering broken database');

  const queryRunner = datasource.createQueryRunner();
  const apps = await queryRunner.query('SELECT * FROM app');
  const users = await queryRunner.query('SELECT * FROM "user"');
  const updates = await queryRunner.query('SELECT * FROM update');

  // drop database
  await datasource.dropDatabase();

  logger.info('running migrations');
  await datasource.runMigrations();

  // recreate users
  await Promise.all(users.map(createUser));

  // create apps
  await Promise.all(apps.map(createApp));

  // create updates
  await Promise.all(updates.map(createUpdate));

  logger.info(`Users recovered ${users.length}`);
  logger.info(`Apps recovered ${apps.length}`);
  logger.info(`Updates recovered ${updates.length}`);
  logger.info('Database fully recovered');
};

export default recover;
