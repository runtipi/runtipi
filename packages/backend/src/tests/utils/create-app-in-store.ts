import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import type { AppInfo } from '@/modules/marketplace/dto/marketplace.dto';
import { faker } from '@faker-js/faker';

export const createAppInStore = async (storeId: number, app: Partial<AppInfo> = {}) => {
  const appInfo: AppInfo = {
    id: faker.string.uuid(),
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
    userConfig: false,
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
  await fs.promises.writeFile(path.join(appStorePath, 'config.json'), JSON.stringify(appInfo, null, 2));
  await fs.promises.writeFile(path.join(appStorePath, 'docker-compose.json'), JSON.stringify(composeJson, null, 2));

  return appInfo;
};
