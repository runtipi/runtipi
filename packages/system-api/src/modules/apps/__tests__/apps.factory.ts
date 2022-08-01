import { faker } from '@faker-js/faker';
import { AppCategoriesEnum, AppInfo, AppStatusEnum, FieldTypes } from '../apps.types';
import config from '../../../config';
import App from '../app.entity';

const createApp = async (installed = false, status = AppStatusEnum.RUNNING, requiredPort?: number) => {
  const categories = Object.values(AppCategoriesEnum);

  const appInfo: AppInfo = {
    id: faker.random.word().toLowerCase().trim(),
    port: faker.datatype.number({ min: 3000, max: 5000 }),
    available: true,
    form_fields: [
      {
        type: FieldTypes.text,
        label: faker.random.word(),
        required: true,
        env_variable: 'TEST_FIELD',
      },
    ],
    requirements: requiredPort
      ? {
          ports: [requiredPort],
        }
      : undefined,
    name: faker.random.word(),
    description: faker.random.words(),
    image: faker.internet.url(),
    short_desc: faker.random.words(),
    author: faker.name.firstName(),
    source: faker.internet.url(),
    categories: [categories[faker.datatype.number({ min: 0, max: categories.length - 1 })]],
  };

  let MockFiles: any = {};
  MockFiles[`${config.ROOT_FOLDER}/.env`] = 'TEST=test';
  MockFiles[`${config.ROOT_FOLDER}/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfo);
  MockFiles[`${config.ROOT_FOLDER}/apps/${appInfo.id}/metadata/description.md`] = 'md desc';

  if (installed) {
    await App.create({
      id: appInfo.id,
      config: { TEST_FIELD: 'test' },
      status,
    }).save();

    MockFiles[`${config.ROOT_FOLDER}/app-data/${appInfo.id}`] = '';
    MockFiles[`${config.ROOT_FOLDER}/app-data/${appInfo.id}/app.env`] = 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test';
  }

  return { appInfo, MockFiles };
};

export { createApp };
