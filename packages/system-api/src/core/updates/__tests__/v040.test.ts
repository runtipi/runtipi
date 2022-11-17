import { faker } from '@faker-js/faker';
import fs from 'fs-extra';
import { DataSource } from 'typeorm';
import logger from '../../../config/logger/logger';
import App from '../../../modules/apps/app.entity';
import { AppInfo, AppStatusEnum } from '../../../modules/apps/apps.types';
import { createApp } from '../../../modules/apps/__tests__/apps.factory';
import User from '../../../modules/auth/user.entity';
import Update, { UpdateStatusEnum } from '../../../modules/system/update.entity';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { getConfig } from '../../config/TipiConfig';
import { updateV040 } from '../v040';

jest.mock('fs');

let db: DataSource | null = null;
const TEST_SUITE = 'updatev040';

beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  await App.clear();
  await Update.clear();
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

const createAppState = (apps: string[]) => JSON.stringify({ installed: apps.join(' ') });
const createUserState = (users: { email: string; password: string }[]) => JSON.stringify(users);

describe('No state/apps.json', () => {
  it('Should do nothing and create the update with status SUCCES', async () => {
    await updateV040();

    const update = await Update.findOne({ where: { name: 'v040' } });

    expect(update).toBeDefined();
    expect(update?.status).toBe(UpdateStatusEnum.SUCCESS);

    const apps = await App.find();

    expect(apps).toHaveLength(0);
  });

  it('Should not run the update if already done', async () => {
    const spy = jest.spyOn(logger, 'info');

    await updateV040();
    await updateV040();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Update v040 already applied');
  });
});

describe('State/apps.json exists with no installed app', () => {
  beforeEach(async () => {
    const { MockFiles } = await createApp({});
    MockFiles[`${getConfig().rootFolder}/state/apps.json`] = createAppState([]);
    // @ts-ignore
    fs.__createMockFiles(MockFiles);
  });

  it('Should do nothing and create the update with status SUCCES', async () => {
    await updateV040();
    const update = await Update.findOne({ where: { name: 'v040' } });

    expect(update).toBeDefined();
    expect(update?.status).toBe(UpdateStatusEnum.SUCCESS);

    const apps = await App.find();
    expect(apps).toHaveLength(0);
  });

  it('Should delete state file after update', async () => {
    await updateV040();
    expect(fs.existsSync('/runtipi/state/apps.json')).toBe(false);
  });
});

describe('State/apps.json exists with one installed app', () => {
  let app1: AppInfo | null = null;
  beforeEach(async () => {
    const { MockFiles, appInfo } = await createApp({});
    app1 = appInfo;
    MockFiles['/runtipi/state/apps.json'] = createAppState([appInfo.id]);
    MockFiles[`/app/storage/app-data/${appInfo.id}`] = '';
    MockFiles[`/app/storage/app-data/${appInfo.id}/app.env`] = 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test';
    // @ts-ignore
    fs.__createMockFiles(MockFiles);
  });

  it('Should create a new app and update', async () => {
    await updateV040();

    const app = await App.findOne({ where: { id: app1?.id } });
    const update = await Update.findOne({ where: { name: 'v040' } });

    expect(app).toBeDefined();
    expect(app?.status).toBe(AppStatusEnum.STOPPED);
    expect(update).toBeDefined();
    expect(update?.status).toBe('SUCCESS');
  });

  it("Should correctly pick up app's variables from existing .env file", async () => {
    await updateV040();
    const app = await App.findOne({ where: { id: app1?.id } });

    expect(app?.config).toStrictEqual({ TEST_FIELD: 'test' });
  });

  it('Should not try to migrate app if it already exists', async () => {
    const { MockFiles, appInfo } = await createApp({ installed: true });
    app1 = appInfo;
    MockFiles['/runtipi/state/apps.json'] = createAppState([appInfo.id]);
    MockFiles[`/app/storage/app-data/${appInfo.id}`] = '';
    MockFiles[`/app/storage/app-data/${appInfo.id}/app.env`] = 'TEST=test\nAPP_PORT=3000\nTEST_FIELD=test';
    // @ts-ignore
    fs.__createMockFiles(MockFiles);

    await updateV040();
    const spy = jest.spyOn(logger, 'info');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('App already migrated');
  });
});

describe('State/users.json exists with no user', () => {
  beforeEach(async () => {
    const { MockFiles } = await createApp({});
    MockFiles[`${getConfig().rootFolder}/state/users.json`] = createUserState([]);
    // @ts-ignore
    fs.__createMockFiles(MockFiles);
  });

  it('Should do nothing and create the update with status SUCCES', async () => {
    await updateV040();
    const update = await Update.findOne({ where: { name: 'v040' } });

    expect(update).toBeDefined();
    expect(update?.status).toBe(UpdateStatusEnum.SUCCESS);

    const apps = await App.find();
    expect(apps).toHaveLength(0);
  });

  it('Should delete state file after update', async () => {
    await updateV040();
    expect(fs.existsSync('/runtipi/state/apps.json')).toBe(false);
  });
});

describe('State/users.json exists with one user', () => {
  const email = faker.internet.email();

  beforeEach(async () => {
    const MockFiles: Record<string, string> = {};
    MockFiles[`/runtipi/state/users.json`] = createUserState([{ email, password: faker.internet.password() }]);
    // @ts-ignore
    fs.__createMockFiles(MockFiles);
  });

  it('Should create a new user and update', async () => {
    await updateV040();

    const user = await User.findOne({ where: { username: email } });
    const update = await Update.findOne({ where: { name: 'v040' } });

    expect(user).toBeDefined();
    expect(update).toBeDefined();
    expect(update?.status).toBe('SUCCESS');
  });
});
