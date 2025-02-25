import type { App } from '@/core/database/drizzle/types';
import { APP_CATEGORIES, type AppCategory, type AppInfo } from '@/modules/apps/dto/app-info.dto';
import { faker } from '@faker-js/faker';

export const createMockAppInfo = (data: Partial<AppInfo> = {}): AppInfo => ({
  id: faker.string.uuid(),
  author: faker.person.fullName(),
  available: true,
  categories: faker.helpers.arrayElement(APP_CATEGORIES) as unknown as AppCategory[],
  created_at: faker.date.past().getTime(),
  updated_at: faker.date.recent().getTime(),
  deprecated: false,
  description: faker.lorem.sentence(),
  dynamic_config: true,
  exposable: true,
  force_expose: false,
  form_fields: [],
  generate_vapid_keys: false,
  https: false,
  name: faker.lorem.words(2),
  no_gui: false,
  short_desc: faker.lorem.sentence(),
  source: faker.internet.url(),
  tipi_version: faker.number.int(),
  version: faker.system.semver(),
  force_pull: false,
  ...data,
});

export const createMockApp = (data: Partial<App>): App => ({
  id: faker.string.uuid(),
  config: {},
  createdAt: faker.date.past().toUTCString(),
  domain: null,
  enableAuth: false,
  exposed: false,
  exposedLocal: false,
  isVisibleOnGuestDashboard: false,
  lastOpened: null,
  numOpened: 0,
  openPort: true,
  status: 'running',
  updatedAt: faker.date.recent().toUTCString(),
  version: 1,
  ...data,
});
