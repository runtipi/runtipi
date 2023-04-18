import { faker } from '@faker-js/faker';
import { AppStatus } from '@/server/db/schema';
import { APP_CATEGORIES } from '../../../server/services/apps/apps.types';
import { App, AppCategory, AppInfo, AppWithInfo } from '../../core/types';

const randomCategory = (): AppCategory[] => {
  const categories = Object.values(APP_CATEGORIES);
  const randomIndex = faker.datatype.number({ min: 0, max: categories.length - 1 });
  return [categories[randomIndex] as AppCategory];
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
    force_expose: false,
    ...overrides,
  };
};

type CreateAppEntityParams = {
  overrides?: Omit<Partial<App>, 'info'>;
  overridesInfo?: Partial<AppInfo>;
  status?: AppStatus;
};

export const createAppEntity = (params: CreateAppEntityParams): AppWithInfo => {
  const { overrides, overridesInfo, status = 'running' } = params;

  const id = faker.random.word().toLowerCase();
  const app = createApp({ id, ...overridesInfo });
  return {
    id,
    status,
    info: app,
    config: {},
    exposed: false,
    domain: null,
    version: 1,
    lastOpened: faker.date.past().toISOString(),
    numOpened: 0,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.past().toISOString(),
    latestVersion: 1,
    latestDockerVersion: '1.0.0',
    ...overrides,
  };
};

export const createAppsRandomly = (count: number): AppInfo[] => Array.from({ length: count }).map(() => createApp());
