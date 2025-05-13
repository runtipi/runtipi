import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants.js';
import { faker } from '@faker-js/faker';
import type { AppInfo, AppInfoInput } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';

export const createAppInStore = async (storeId: string, app: Partial<AppInfo> = {}) => {
  const id = app.id ?? faker.lorem.words(3).split(' ').join('-').toLowerCase();

  const appInfo: AppInfoInput = {
    id,
    urn: `${id}:${storeId}` as AppUrn,
    name: faker.lorem.words(2),
    port: faker.number.int({ min: 1000, max: 9999 }),
    https: false,
    author: faker.internet.username(),
    no_gui: false,
    available: true,
    exposable: true,
    dynamic_config: true,
    source: faker.internet.url(),
    version: faker.system.semver(),
    categories: ['utilities'],
    description: faker.lorem.sentence(),
    short_desc: faker.lorem.sentence(),
    website: faker.internet.url(),
    supported_architectures: [],
    created_at: new Date().getTime(),
    updated_at: new Date().getTime(),
    deprecated: false,
    tipi_version: 1,
    force_expose: false,
    generate_vapid_keys: false,
    form_fields: [],
    ...app,
  };

  const composeJson = {
    services: [
      {
        name: appInfo.id,
        image: 'test',
        isMain: true,
        internalPort: 80,
        environment: {
          TEST: 'test',
        },
      },
    ],
  };

  const appStorePath = `${DATA_DIR}/repos/${storeId}/apps/${appInfo.id}`;

  await fs.promises.mkdir(`${DATA_DIR}/repos/${storeId}/apps/${appInfo.id}/data`, { recursive: true });
  await fs.promises.mkdir(`${DATA_DIR}/repos/${storeId}/apps/${appInfo.id}/metadata`, { recursive: true });

  await fs.promises.writeFile(path.join(appStorePath, 'config.json'), JSON.stringify(appInfo, null, 2));
  await fs.promises.writeFile(path.join(appStorePath, 'docker-compose.json'), JSON.stringify(composeJson, null, 2));
  await fs.promises.writeFile(path.join(appStorePath, 'metadata', 'description.md'), 'test');

  return appInfo;
};
