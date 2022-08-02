import datasource from '../../config/datasource';
import App from '../../modules/apps/app.entity';
import User from '../../modules/auth/user.entity';
import Update from '../../modules/system/update.entity';

const recover = async () => {
  console.log('Recovering broken database');
  const apps = await App.find();
  const users = await User.find();
  const updated = await Update.find();

  // drop database
  await datasource.dropDatabase();

  console.log('running migrations');
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

  console.log('Users recovered', users.length);
  console.log('Apps recovered', apps.length);
  console.log('Database recovered');
};

export default recover;
