import { faker } from '@faker-js/faker';
import fs from 'fs';
import { APP_CATEGORIES, AppInfo, appInfoSchema } from '@runtipi/shared';
import { getEnv } from '@/utils/environment/environment';

export const createAppConfig = (props?: Partial<AppInfo>, isInstalled = true) => {
  const { rootFolderHost, storagePath } = getEnv();

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
  mockFiles[`${rootFolderHost}/.env`] = 'TEST=test';
  mockFiles[`${rootFolderHost}/repos/repo-id/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfoSchema.parse(appInfo));
  mockFiles[`${rootFolderHost}/repos/repo-id/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
  mockFiles[`${rootFolderHost}/repos/repo-id/apps/${appInfo.id}/metadata/description.md`] = 'md desc';

  if (isInstalled) {
    mockFiles[`${rootFolderHost}/apps/${appInfo.id}/config.json`] = JSON.stringify(appInfoSchema.parse(appInfo));
    mockFiles[`${rootFolderHost}/apps/${appInfo.id}/docker-compose.yml`] = 'compose';
    mockFiles[`${rootFolderHost}/apps/${appInfo.id}/metadata/description.md`] = 'md desc';
    mockFiles[`${storagePath}/app-data/${appInfo.id}/data/test.txt`] = 'data';
  }

  // @ts-expect-error - custom mock method
  fs.__applyMockFiles(mockFiles);

  return appInfo;
};
