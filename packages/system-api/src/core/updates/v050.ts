import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import Update, { UpdateStatusEnum } from '../../modules/system/update.entity';

const UPDATE_NAME = 'v050';

export const updateV050 = async (): Promise<void> => {
  try {
    const update = await Update.findOne({ where: { name: UPDATE_NAME } });

    if (update) {
      logger.info(`Update ${UPDATE_NAME} already applied`);
      return;
    }

    const apps = await App.find();

    for (const app of apps) {
      await App.update(app.id, { version: 1 });
    }

    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.SUCCESS }).save();
    logger.info(`Update ${UPDATE_NAME} applied`);
  } catch (error) {
    logger.error(error);
    console.error(error);
    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.FAILED }).save();
  }
};
