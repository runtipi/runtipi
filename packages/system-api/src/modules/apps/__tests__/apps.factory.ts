import { faker } from '@faker-js/faker';
import { AppCategoriesEnum, AppInfo, AppStatusEnum, FieldTypes } from '../apps.types';
import config from '../../../config';
import App from '../app.entity';

interface IProps {
  installed?: boolean;
  status?: AppStatusEnum;
  requiredPort?: number;
  randomField?: boolean;
  exposed?: boolean;
  domain?: string;
  exposable?: boolean;
}

const createApp = async (props: IProps) => {
  const { installed = false, status = AppStatusEnum.RUNNING, requiredPort, randomField = false, exposed = false, domain = '', exposable = false } = props;

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
    name: faker.random.word(),
    description: faker.random.words(),
    tipi_version: faker.datatype.number({ min: 1, max: 10 }),
    short_desc: faker.random.words(),
    author: faker.name.firstName(),
    source: faker.internet.url(),
    categories: [categories[faker.datatype.number({ min: 0, max: categories.length - 1 })]],
    exposable,
  };

  if (randomField) {
    appInfo.form_fields?.push({
      type: FieldTypes.random,
      label: faker.random.word(),
      env_variable: 'RANDOM_FIELD',
    });
  }

  if (requiredPort) {
    appInfo.requirements = {
      ports: [requiredPort],
    };
  }

  let MockFiles: any = {};
  MockFiles[`${config.ROOT_FOLDER}/.env`] = 'TEST=test';
  MockFiles[`${config.ROOT_FOLDER}/repos/repo-id`] = '';
  MockFiles[`${config.ROOT_FOLDER}/repos/repo-id/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfo);
  MockFiles[`${config.ROOT_FOLDER}/repos/repo-id/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
  MockFiles[`${config.ROOT_FOLDER}/repos/repo-id/apps/${appInfo.id}/metadata/description.md`] = 'md desc';

  let appEntity = new App();
  if (installed) {
    appEntity = await App.create({
      id: appInfo.id,
      config: { TEST_FIELD: 'test' },
      status,
      exposed,
      domain,
    }).save();

    MockFiles[`${config.ROOT_FOLDER}/app-data/${appInfo.id}`] = '';
    MockFiles[`${config.ROOT_FOLDER}/app-data/${appInfo.id}/app.env`] = 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test';
    MockFiles[`${config.ROOT_FOLDER}/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfo);
    MockFiles[`${config.ROOT_FOLDER}/apps/${appInfo.id}/metadata/description.md`] = 'md desc';
  }

  return { appInfo, MockFiles, appEntity };
};

export { createApp };
