import fs from 'node:fs';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { faker } from '@faker-js/faker';
import { APP_CATEGORIES, type AppInfo, appInfoSchema } from '@runtipi/shared';

export const createAppConfig = (props?: Partial<AppInfo>, isInstalled = true) => {
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

  if (isInstalled) {
    mockFiles[`${DATA_DIR}/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfoSchema.parse(appInfo));
    mockFiles[`${DATA_DIR}/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
    mockFiles[`${DATA_DIR}/apps/${appInfo.id}/metadata/description.md`] = 'md desc';
    mockFiles[`${APP_DATA_DIR}/${appInfo.id}/data/test.txt`] = 'data';
  }

  // @ts-expect-error - custom mock method
  fs.__applyMockFiles(mockFiles);

  return appInfo;
};
