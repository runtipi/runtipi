import { createAppUrn } from '@/common/helpers/app-helpers';
import type { App } from '@/core/database/drizzle/types';
import { APP_CATEGORIES, type AppCategory, type AppInfo } from '@/modules/marketplace/dto/marketplace.dto';
import { faker } from '@faker-js/faker';

export const createMockAppInfo = (data: Partial<AppInfo> = {}): AppInfo => {
  const id = faker.string.uuid();
  const storeId = faker.string.uuid();

  return {
    id,
    urn: createAppUrn(id, storeId),
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
  };
};

export const createMockApp = (data: Partial<App>): App => ({
  id: faker.number.int(),
  appName: faker.lorem.words(2),
  appStoreSlug: faker.lorem.slug(),
  config: {},
  createdAt: faker.date.past().toUTCString(),
  domain: null,
  enableAuth: false,
  exposed: false,
  exposedLocal: false,
  isVisibleOnGuestDashboard: false,
  openPort: true,
  port: faker.number.int({ min: 1024, max: 65535 }),
  status: 'running',
  updatedAt: faker.date.recent().toUTCString(),
  version: 1,
  subnet: '',
  ...data,
});
