import { faker } from '@faker-js/faker';
import { App, AppCategoriesEnum, AppInfo, AppStatusEnum } from '../../generated/graphql';

const randomCategory = (): AppCategoriesEnum[] => {
  const categories = Object.values(AppCategoriesEnum);
  const randomIndex = faker.datatype.number({ min: 0, max: categories.length - 1 });
  return [categories[randomIndex] as AppCategoriesEnum];
};

export const createApp = (overrides?: Partial<AppInfo>): AppInfo => {
  const name = faker.random.word();
  return {
    id: name.toLowerCase(),
    name,
    description: faker.random.words(),
    author: faker.random.word(),
    available: true,
    categories: randomCategory(),
    form_fields: [],
    port: faker.datatype.number({ min: 1000, max: 9999 }),
    short_desc: faker.random.words(),
    tipi_version: 1,
    version: faker.system.semver(),
    source: faker.internet.url(),
    https: false,
    no_gui: false,
    exposable: true,
    url_suffix: '',
    ...overrides,
  };
};

type CreateAppEntityParams = {
  overrides?: Omit<Partial<App>, 'info'>;
  overridesInfo?: Partial<AppInfo>;
  status?: AppStatusEnum;
};

export const createAppEntity = (params: CreateAppEntityParams) => {
  const { overrides, overridesInfo, status = AppStatusEnum.Running } = params;

  const id = faker.random.word().toLowerCase();
  const app = createApp({ id, ...overridesInfo });
  return {
    id,
    status,
    info: app,
    config: {},
    exposed: false,
    updateInfo: null,
    domain: null,
    version: 1,
    ...overrides,
  };
};

export const createAppsRandomly = (count: number): AppInfo[] => Array.from({ length: count }).map(() => createApp());
