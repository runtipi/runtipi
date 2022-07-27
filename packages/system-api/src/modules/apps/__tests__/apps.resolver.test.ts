import { DataSource } from 'typeorm';
import { setupConnection, teardownConnection } from '../../../test/connection';
import fs from 'fs';
import { gcall } from '../../../test/gcall';
import App from '../app.entity';
import { listAppInfosQuery } from '../../../test/queries';
import { createApp } from './apps.factory';
import { AppInfo, ListAppsResonse } from '../apps.types';

jest.mock('fs');

let db: DataSource | null = null;
const TEST_SUITE = 'appsresolver';

beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  await App.clear();
});

describe('ListAppsInfos', () => {
  let app1: AppInfo;

  beforeEach(async () => {
    const { MockFiles, appInfo } = await createApp();
    app1 = appInfo;
    // @ts-ignore
    fs.__createMockFiles(MockFiles);
  });

  it('Can list apps', async () => {
    const { data } = await gcall<{ listAppsInfo: ListAppsResonse }>({ source: listAppInfosQuery });

    expect(data?.listAppsInfo.apps.length).toBe(1);
    expect(data?.listAppsInfo.total).toBe(1);

    const app = data?.listAppsInfo.apps[0];

    expect(app?.id).toBe(app1.id);
    expect(app?.author).toBe(app1.author);
    expect(app?.name).toBe(app1.name);
    expect(app?.available).toBe(app1.available);
  });
});
