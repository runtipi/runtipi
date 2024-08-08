import fs from 'fs-extra';
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import { type AppInfo, type Architecture, appInfoSchema, APP_CATEGORIES } from '@runtipi/shared';
import { APP_DATA_DIR, DATA_DIR } from '../../config';
import type { TestDatabase } from './test-utils';
import { appTable, type AppStatus, type App, type NewApp } from '@runtipi/db';

interface IProps {
  installed?: boolean;
  openPort?: boolean;
  status?: AppStatus;
  requiredPort?: number;
  randomField?: boolean;
  exposed?: boolean;
  exposedLocal?: boolean;
  domain?: string;
  exposable?: boolean;
  forceExpose?: boolean;
  generateVapidKeys?: boolean;
  supportedArchitectures?: Architecture[];
}

const createAppConfig = (props?: Partial<AppInfo>) => {
  const appInfo = appInfoSchema.parse({
    id: faker.string.alphanumeric(32),
    available: true,
    port: faker.number.int({ min: 30, max: 65535 }),
    name: faker.string.alphanumeric(32),
    description: faker.string.alphanumeric(32),
    tipi_version: 1,
    short_desc: faker.string.alphanumeric(32),
    author: faker.string.alphanumeric(32),
    source: faker.internet.url(),
    categories: [APP_CATEGORIES.AUTOMATION],
    ...props,
  });

  const mockFiles: Record<string, string | string[]> = {};
  mockFiles[`${DATA_DIR}/.env`] = 'TEST=test';
  mockFiles[`${DATA_DIR}/repos/repo-id/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfoSchema.parse(appInfo));
  mockFiles[`${DATA_DIR}/repos/repo-id/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
  mockFiles[`${DATA_DIR}/repos/repo-id/apps/${appInfo.id}/metadata/description.md`] = 'md desc';

  // @ts-expect-error - custom mock method
  fs.__applyMockFiles(mockFiles);

  return appInfo;
};

const createApp = async (props: IProps, database: TestDatabase) => {
  const {
    installed = false,
    status = 'running',
    randomField = false,
    exposed = false,
    exposedLocal = false,
    openPort = true,
    domain = null,
    exposable = false,
    supportedArchitectures,
    forceExpose = false,
    generateVapidKeys = false,
  } = props;

  const categories = Object.values(APP_CATEGORIES);

  const randomId = faker.string.alphanumeric(32);

  const appInfo: AppInfo = {
    id: randomId,
    dynamic_config: true,
    deprecated: false,
    port: faker.number.int({ min: 3000, max: 5000 }),
    available: true,
    form_fields: [
      {
        type: 'text',
        label: faker.lorem.word(),
        required: true,
        env_variable: 'TEST_FIELD',
      },
    ],
    name: faker.lorem.word(),
    description: faker.lorem.words(),
    tipi_version: faker.number.int({ min: 1, max: 10 }),
    short_desc: faker.lorem.words(),
    author: faker.person.firstName(),
    source: faker.internet.url(),
    categories: [categories[faker.number.int({ min: 0, max: categories.length - 1 })]] as AppInfo['categories'],
    exposable,
    force_expose: forceExpose,
    supported_architectures: supportedArchitectures,
    version: String(faker.number.int({ min: 1, max: 10 })),
    https: false,
    no_gui: false,
    generate_vapid_keys: generateVapidKeys,
  };

  if (randomField) {
    appInfo.form_fields?.push({
      required: false,
      type: 'random',
      label: faker.lorem.word(),
      env_variable: 'RANDOM_FIELD',
    });
  }

  const mockFiles: Record<string, string | string[]> = {};
  mockFiles[`${DATA_DIR}/.env`] = 'TEST=test';
  mockFiles[`${DATA_DIR}/repos/repo-id/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfoSchema.parse(appInfo));
  mockFiles[`${DATA_DIR}/repos/repo-id/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
  mockFiles[`${DATA_DIR}/repos/repo-id/apps/${appInfo.id}/metadata/description.md`] = 'md desc';

  let appEntity: App = {} as App;
  if (installed) {
    const insertedApp = await database.dbClient.db
      .insert(appTable)
      .values({
        id: appInfo.id,
        config: { TEST_FIELD: 'test' },
        status,
        exposed,
        domain,
        version: 1,
        openPort,
        exposedLocal,
      })
      .returning();

    // eslint-disable-next-line prefer-destructuring
    appEntity = insertedApp[0] as App;
    mockFiles[`${APP_DATA_DIR}/${appInfo.id}/app.env`] = 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test';
    mockFiles[`${DATA_DIR}/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfo);
    mockFiles[`${DATA_DIR}/apps/${appInfo.id}/metadata/description.md`] = 'md desc';
  }

  // @ts-expect-error - custom mock method
  fs.__applyMockFiles(mockFiles);

  return { appInfo, MockFiles: mockFiles, appEntity };
};

const insertApp = async (data: Partial<NewApp>, appInfo: AppInfo, database: TestDatabase) => {
  const values: NewApp = {
    id: appInfo.id,
    config: {},
    status: 'running',
    exposed: false,
    exposedLocal: false,
    domain: null,
    version: 1,
    openPort: true,
    ...data,
  };

  const mockFiles: Record<string, string | string[]> = {};
  if (data.status !== 'missing') {
    mockFiles[`${APP_DATA_DIR}/${values.id}/app.env`] = `TEST=test\nAPP_PORT=3000\n${Object.entries(data.config || {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')}`;
    mockFiles[`${DATA_DIR}/apps/${values.id}/config.json`] = JSON.stringify(appInfo);
    mockFiles[`${DATA_DIR}/apps/${values.id}/metadata/description.md`] = 'md desc';
    mockFiles[`${DATA_DIR}/apps/${values.id}/docker-compose.yml`] = 'compose';
  }

  // @ts-expect-error - custom mock method
  fs.__applyMockFiles(mockFiles);

  const insertedApp = await database.dbClient.db.insert(appTable).values(values).returning();
  return insertedApp[0] as App;
};

const getAppById = async (id: string, database: TestDatabase) => {
  const apps = await database.dbClient.db.select().from(appTable).where(eq(appTable.id, id));
  return apps[0] || null;
};

const updateApp = async (id: string, props: Partial<App>, database: TestDatabase) => {
  await database.dbClient.db.update(appTable).set(props).where(eq(appTable.id, id));
};

const getAllApps = async (database: TestDatabase) => {
  const apps = await database.dbClient.db.select().from(appTable);
  return apps;
};

export { createApp, getAppById, updateApp, getAllApps, createAppConfig, insertApp };
