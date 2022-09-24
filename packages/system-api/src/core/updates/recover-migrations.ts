import { DataSource } from 'typeorm';
import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import User from '../../modules/auth/user.entity';
import Update from '../../modules/system/update.entity';

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

  // create users
  for (const user of users) {
    await User.create(user).save();
  }

  // create apps
  for (const app of apps) {
    await App.create(app).save();
  }

  // create updates
  for (const update of updates) {
    await Update.create(update).save();
  }

  logger.info(`Users recovered ${users.length}`);
  logger.info(`Apps recovered ${apps.length}`);
  logger.info(`Updates recovered ${updates.length}`);
  logger.info('Database fully recovered');
};

export default recover;
