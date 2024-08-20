import path from 'node:path';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { AppQueries } from '@/server/queries/apps/apps.queries';
import { type TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { faker } from '@faker-js/faker';
import { AppDataService } from '@runtipi/shared/node';
import fs from 'fs-extra';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TipiConfig } from '../../core/TipiConfig';
import { createAppConfig, insertApp } from '../../tests/apps.factory';
import { AppCatalogCache } from './app-catalog-cache';
import { AppCatalogClass } from './app-catalog.service';

let db: TestDatabase;
let appCatalog: AppCatalogClass;
const TEST_SUITE = 'appcatalog';

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
});

beforeEach(async () => {
  const appDataService = new AppDataService({ dataDir: DATA_DIR, appDataDir: APP_DATA_DIR, appsRepoId: TipiConfig.getConfig().appsRepoId });
  appCatalog = new AppCatalogClass(new AppQueries(db.dbClient), new AppCatalogCache(appDataService), appDataService);
  await clearDatabase(db);
  await TipiConfig.setConfig('version', 'test');
});

afterAll(async () => {
  await closeDatabase(db);
});

describe('Get app config', () => {
  it('should correctly get app config', async () => {
    // arrange
    const appConfig = createAppConfig({});
    await insertApp({ config: { TEST_FIELD: 'test' } }, appConfig, db);

    // act
    const app = await appCatalog.executeCommand('getApp', appConfig.id);

    // assert
    expect(app).toBeDefined();
    expect(app.config).toStrictEqual({ TEST_FIELD: 'test' });
    expect(app.id).toBe(appConfig.id);
    expect(app.status).toBe('running');
  });

  it('should return default values if app is not installed', async () => {
    // arrange
    const appConfig = createAppConfig({});

    // act
    const app = await appCatalog.executeCommand('getApp', appConfig.id);

    // assert
    expect(app).toBeDefined();
    expect(app.id).toBe(appConfig.id);
    expect(app.config).toStrictEqual({});
    expect(app.status).toBe('missing');
  });
});

describe('List apps', () => {
  it('should correctly list apps sorted by id', async () => {
    // arrange
    const randomName1 = faker.lorem.word();
    const randomName2 = faker.lorem.word();
    const sortedNames = [randomName1, randomName2].sort((a, b) => a.localeCompare(b));

    const appConfig = createAppConfig({ id: randomName1.toLowerCase(), name: randomName1 });
    const appConfig2 = createAppConfig({ id: randomName2.toLowerCase(), name: randomName2 });
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);

    // act
    const { apps } = await appCatalog.executeCommand('listApps');

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(2);
    expect(apps[0]?.name).toBe(sortedNames[0]);
    expect(apps[1]?.name).toBe(sortedNames[1]);
  });

  it('should not list apps that have supportedArchitectures and are not supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    createAppConfig({ supported_architectures: ['amd64'] });

    // act
    const { apps } = await appCatalog.executeCommand('listApps');

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(0);
  });

  it('should list apps that have supportedArchitectures and are supported', async () => {
    // arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    createAppConfig({ supported_architectures: ['arm64'] });

    // act
    const { apps } = await appCatalog.executeCommand('listApps');

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it('should list apps that have no supportedArchitectures specified', async () => {
    // Arrange
    await TipiConfig.setConfig('architecture', 'arm64');
    createAppConfig({ supported_architectures: undefined });

    // act
    const { apps } = await appCatalog.executeCommand('listApps');

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });

  it('should not list app with invalid config.json', async () => {
    // arrange
    const appInfo = createAppConfig({});
    createAppConfig({});
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appInfo.id, 'config.json'), 'invalid json');

    // act
    const { apps } = await appCatalog.executeCommand('listApps');

    // assert
    expect(apps).toBeDefined();
    expect(apps.length).toBe(1);
  });
});

describe('installedApps', () => {
  it('should list installed apps', async () => {
    // arrange
    const appConfig = createAppConfig({});
    const appConfig2 = createAppConfig({});
    const appConfig3 = createAppConfig({});
    createAppConfig({});
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);
    await insertApp({}, appConfig3, db);

    // act
    const apps = await appCatalog.executeCommand('getInstalledApps');

    // assert
    expect(apps.length).toBe(3);
  });

  it('should not list app with invalid config', async () => {
    // arrange
    const appConfig = createAppConfig({ id: '1' });
    const appConfig2 = createAppConfig({ id: '2' });
    const appConfig3 = createAppConfig({ id: '3' });
    createAppConfig({ id: '4' });
    await insertApp({}, appConfig, db);
    await insertApp({}, appConfig2, db);
    await insertApp({}, appConfig3, db);

    fs.writeFileSync(path.join(DATA_DIR, 'apps', appConfig3.id, 'config.json'), 'invalid json');
    fs.writeFileSync(path.join(DATA_DIR, 'repos', 'repo-id', 'apps', appConfig3.id, 'config.json'), 'invalid json');

    // act
    const apps = await appCatalog.executeCommand('getInstalledApps');

    // assert
    expect(apps.length).toBe(2);
  });
});
