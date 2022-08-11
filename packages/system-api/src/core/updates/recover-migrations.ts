import datasource from '../../config/datasource';
import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import User from '../../modules/auth/user.entity';
import Update from '../../modules/system/update.entity';

const recover = async () => {
  logger.info('Recovering broken database');
  const apps = await App.find();
  const users = await User.find();
  const updated = await Update.find();

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
  for (const update of updated) {
    await Update.create(update).save();
  }

  logger.info('Users recovered', users.length);
  logger.info('Apps recovered', apps.length);
  logger.info('Database recovered');
};

export default recover;
