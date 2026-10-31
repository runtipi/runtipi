import { app as appTable, appMigration, appRestoreJournal, type MigrationLedgerState } from '@/core/database/drizzle/schema';
import { AppsRepository } from '@/modules/apps/apps.repository';
import type { AppUrn } from '@runtipi/common/types';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { cleanTestData, createTestDatabase, type TestDatabase } from '../utils/create-test-database';

const appUrn = 'demo:test' as AppUrn;
const recovery = { backupFilename: 'recovery.tar.gz', migrationIds: ['new-v2'] };
const previousState: MigrationLedgerState = { initialized: true, migrationIds: ['old-v1'] };
const targetState: MigrationLedgerState = { initialized: true, migrationIds: ['new-v2'] };
let db: TestDatabase;
let repository: AppsRepository;

beforeAll(async () => {
  db = await createTestDatabase('migration_transactions');
  repository = new AppsRepository(db);
  await db.execute(sql`ALTER TABLE app_migration ADD CONSTRAINT reject_invalid_migration CHECK (migration_id <> 'invalid')`);
  await db.execute(sql`ALTER TABLE app ADD CONSTRAINT reject_invalid_version CHECK (version <> -1)`);
});

beforeEach(async () => {
  await cleanTestData(db);
  await repository.createApp({ appName: 'demo', appStoreSlug: 'test', config: {} });
  await repository.baselineMigrations(appUrn, previousState.migrationIds);
  await repository.setMigrationRecovery(appUrn, recovery);
});

afterAll(async () => {
  await db.$client.end();
});

test('commits the app version, settings, batch ledger, and recovery marker together', async () => {
  await repository.completeMigrations(appUrn, ['new-v2'], { version: 2, config: { migrated: true } });

  const freshRepository = new AppsRepository(db);
  expect(await freshRepository.getAppByUrn(appUrn)).toMatchObject({ version: 2, config: { migrated: true }, migrationRecovery: null });
  expect(await freshRepository.getMigrationState(appUrn)).toEqual({ initialized: true, migrationIds: ['new-v2', 'old-v1'] });
});

test('retains the marker and previous ledger when batch persistence fails', async () => {
  const previousApp = await repository.getAppByUrn(appUrn);
  await expect(repository.completeMigrations(appUrn, ['new-v2', 'invalid'], { version: 2, config: { migrated: true } })).rejects.toThrow();

  expect(await repository.getAppByUrn(appUrn)).toMatchObject({ version: previousApp?.version, config: {}, migrationRecovery: recovery });
  expect(await repository.getMigrationState(appUrn)).toEqual(previousState);
});

test('retains the ledger and recovery marker when saving the deployed app fails', async () => {
  await expect(repository.completeMigrations(appUrn, ['new-v2'], { version: -1 })).rejects.toThrow();

  expect((await repository.getAppByUrn(appUrn))?.migrationRecovery).toEqual(recovery);
  expect(await repository.getMigrationState(appUrn)).toEqual(previousState);
});

test('commits restored ledger, journal decision, and batch recovery together', async () => {
  await repository.createRestoreJournal(appUrn, previousState, targetState, []);

  await repository.finishRestore(appUrn, targetState, 'committed');

  expect(await repository.getMigrationState(appUrn)).toEqual(targetState);
  expect((await repository.getRestoreJournal(appUrn))?.phase).toBe('committed');
  expect((await repository.getAppByUrn(appUrn))?.migrationRecovery).toBeNull();
});

test('rolls back every restore database change when ledger replacement fails', async () => {
  await repository.createRestoreJournal(appUrn, previousState, targetState, []);

  await expect(repository.finishRestore(appUrn, { initialized: false, migrationIds: ['new-v2', 'invalid'] }, 'committed')).rejects.toThrow();

  expect(await repository.getMigrationState(appUrn)).toEqual(previousState);
  expect((await repository.getRestoreJournal(appUrn))?.phase).toBe('prepared');
  expect((await repository.getAppByUrn(appUrn))?.migrationRecovery).toEqual(recovery);
});

test('keeps the batch marker until a rolled-back restore can be retried', async () => {
  await repository.createRestoreJournal(appUrn, previousState, targetState, []);

  await repository.finishRestore(appUrn, previousState, 'recovered');

  expect((await repository.getRestoreJournal(appUrn))?.phase).toBe('recovered');
  expect((await repository.getAppByUrn(appUrn))?.migrationRecovery).toEqual(recovery);
});

test('cascades migration and restore records when an app is removed', async () => {
  await repository.createRestoreJournal(appUrn, previousState, targetState, []);
  const app = await repository.getAppByUrn(appUrn);
  if (!app) throw new Error('Missing installed app');

  await repository.deleteAppById(app.id);

  expect(await db.select().from(appMigration).where(eq(appMigration.appId, app.id))).toEqual([]);
  expect(await db.select().from(appRestoreJournal).where(eq(appRestoreJournal.appId, app.id))).toEqual([]);
  expect(await db.select().from(appTable).where(eq(appTable.id, app.id))).toEqual([]);
});
