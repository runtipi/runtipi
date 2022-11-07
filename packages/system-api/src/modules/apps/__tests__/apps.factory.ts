import { faker } from '@faker-js/faker';
import { AppCategoriesEnum, AppInfo, AppStatusEnum, AppSupportedArchitecturesEnum, FieldTypes } from '../apps.types';
import App from '../app.entity';

interface IProps {
  installed?: boolean;
  status?: AppStatusEnum;
  requiredPort?: number;
  randomField?: boolean;
  exposed?: boolean;
  domain?: string;
  exposable?: boolean;
  supportedArchitectures?: AppSupportedArchitecturesEnum[];
}

const createApp = async (props: IProps) => {
  const { installed = false, status = AppStatusEnum.RUNNING, requiredPort, randomField = false, exposed = false, domain = '', exposable = false, supportedArchitectures } = props;

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
    supported_architectures: supportedArchitectures,
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

  const MockFiles: Record<string, string | string[]> = {};
  MockFiles['/runtipi/.env'] = 'TEST=test';
  MockFiles['/runtipi/repos/repo-id'] = '';
  MockFiles[`/runtipi/repos/repo-id/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfo);
  MockFiles[`/runtipi/repos/repo-id/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
  MockFiles[`/runtipi/repos/repo-id/apps/${appInfo.id}/metadata/description.md`] = 'md desc';

  let appEntity = new App();
  if (installed) {
    appEntity = await App.create({
      id: appInfo.id,
      config: { TEST_FIELD: 'test' },
      status,
      exposed,
      domain,
      version: 1,
    }).save();

    MockFiles[`/app/storage/app-data/${appInfo.id}`] = '';
    MockFiles[`/app/storage/app-data/${appInfo.id}/app.env`] = 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test';
    MockFiles[`/runtipi/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfo);
    MockFiles[`/runtipi/apps/${appInfo.id}/metadata/description.md`] = 'md desc';
  }

  return { appInfo, MockFiles, appEntity };
};

export { createApp };
