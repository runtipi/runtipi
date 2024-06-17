import fs from 'fs-extra';
import { fromAny } from '@total-typescript/shoehorn';
import { TestDatabase, clearDatabase, closeDatabase, createDatabase } from '@/server/tests/test-utils';
import { appInfoSchema } from '@runtipi/shared';
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { createAppConfig } from '../../tests/apps.factory';

let db: TestDatabase;
const TEST_SUITE = 'appshelpers';

beforeAll(async () => {
  db = await createDatabase(TEST_SUITE);
});

beforeEach(async () => {
  await clearDatabase(db);
});

afterAll(async () => {
  await closeDatabase(db);
});

describe('Test: appInfoSchema', () => {
  it('should default form_field type to text if it is wrong', async () => {
    // arrange
    const appConfig = createAppConfig(fromAny({ form_fields: [{ env_variable: 'test', type: 'wrong', label: 'yo', required: true }] }));
    await fs.promises.mkdir(`/app/storage/app-data/${appConfig.id}`, { recursive: true });
    await fs.promises.writeFile(`/app/storage/app-data/${appConfig.id}/config.json`, JSON.stringify(appConfig));

    // act
    const appInfo = appInfoSchema.safeParse(appConfig);

    // assert
    expect(appInfo.success).toBe(true);
    if (appInfo.success) {
      expect(appInfo.data.form_fields[0]?.type).toBe('text');
    } else {
      expect(true).toBe(false);
    }
  });

  it('should default categories to ["utilities"] if it is wrong', async () => {
    // arrange
    const appConfig = createAppConfig(fromAny({ categories: 'wrong' }));
    await fs.promises.mkdir(`/app/storage/app-data/${appConfig.id}`, { recursive: true });
    await fs.promises.writeFile(`/app/storage/app-data/${appConfig.id}/config.json`, JSON.stringify(appConfig));

    // act
    const appInfo = appInfoSchema.safeParse(appConfig);

    // assert
    expect(appInfo.success).toBe(true);
    if (appInfo.success) {
      expect(appInfo.data.categories).toStrictEqual(['utilities']);
    } else {
      expect(true).toBe(false);
    }
  });
});
