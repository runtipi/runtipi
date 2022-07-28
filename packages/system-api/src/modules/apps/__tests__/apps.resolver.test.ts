import { DataSource } from 'typeorm';
import { setupConnection, teardownConnection } from '../../../test/connection';
import fs from 'fs';
import { gcall } from '../../../test/gcall';
import App from '../app.entity';
import { getAppQuery, listAppInfosQuery } from '../../../test/queries';
import { createApp } from './apps.factory';
import { AppInfo, AppStatusEnum, ListAppsResonse } from '../apps.types';

jest.mock('fs');

type TApp = App & {
  info: AppInfo;
};

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

describe('GetApp', () => {
  let app1: AppInfo;
  let app2: AppInfo;

  beforeEach(async () => {
    const app1create = await createApp();
    const app2create = await createApp(true);
    app1 = app1create.appInfo;
    app2 = app2create.appInfo;
    // @ts-ignore
    fs.__createMockFiles(Object.assign(app1create.MockFiles, app2create.MockFiles));
  });

  it('Can get app', async () => {
    const { data } = await gcall<{ getApp: TApp }>({
      source: getAppQuery,
      variableValues: { id: app1.id },
    });

    expect(data?.getApp.info.id).toBe(app1.id);
    expect(data?.getApp.status).toBe(AppStatusEnum.MISSING.toUpperCase());

    const { data: data2 } = await gcall<{ getApp: TApp }>({
      source: getAppQuery,
      variableValues: { id: app2.id },
    });

    expect(data2?.getApp.info.id).toBe(app2.id);
  });

  it("Should return an error if app doesn't exist", async () => {
    const { data, errors } = await gcall<{ getApp: TApp }>({
      source: getAppQuery,
      variableValues: { id: 'not-existing' },
    });

    expect(errors?.[0].message).toBe('App not-existing not found');
    expect(data?.getApp).toBeUndefined();
  });
});
