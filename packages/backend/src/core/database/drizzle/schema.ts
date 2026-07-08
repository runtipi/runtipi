import { relations, sql } from 'drizzle-orm';
import { boolean, customType, integer, jsonb, pgEnum, pgTable, primaryKey, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const appStatusEnum = pgEnum('app_status_enum', [
  'running',
  'stopped',
  'installing',
  'uninstalling',
  'stopping',
  'starting',
  'missing',
  'updating',
  'resetting',
  'restarting',
  'backing_up',
  'restoring',
]);
export const updateStatusEnum = pgEnum('update_status_enum', ['FAILED', 'SUCCESS']);

export const link = pgTable('link', {
  id: serial().primaryKey().notNull(),
  title: varchar({ length: 20 }).notNull(),
  url: varchar().notNull(),
  iconUrl: varchar('icon_url'),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())`),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id),
  description: varchar({ length: 50 }),
  isVisibleOnGuestDashboard: boolean('is_visible_on_guest_dashboard').default(false).notNull(),
});

const appConfig = customType<{ data: Record<string, unknown>; driverData: string }>({
  dataType() {
    return 'jsonb';
  },
  toDriver(value: Record<string, unknown>): string {
    return JSON.stringify(value);
  },
});

export type MigrationLedgerState = {
  initialized: boolean;
  migrationIds: string[];
};

export type RestoreDirectory = {
  destination: string;
  staged: string;
  original: string;
  destinationExisted: boolean;
};

export type RestorePhase = 'prepared' | 'recovered' | 'committed';

export type MigrationRecovery = {
  backupFilename: string;
  migrationIds: string[];
};

export const app = pgTable('app', {
  id: serial().primaryKey().notNull(),
  status: appStatusEnum().default('stopped').notNull(),
  config: appConfig('config').notNull(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())`),
  version: integer().default(1).notNull(),
  ignoredVersion: integer('ignored_version'),
  exposed: boolean().default(false).notNull(),
  domain: varchar(),
  isVisibleOnGuestDashboard: boolean('is_visible_on_guest_dashboard').default(false).notNull(),
  migrationsBaselined: boolean('migrations_baselined').default(false).notNull(),
  migrationRecovery: jsonb('migration_recovery').$type<MigrationRecovery>(),
  openPort: boolean('open_port').default(true).notNull(),
  port: integer(),
  exposedLocal: boolean('exposed_local').default(false).notNull(),
  appStoreSlug: varchar('app_store_slug').notNull(),
  appName: varchar('app_name').notNull(),
  enableAuth: boolean('enable_auth').default(false).notNull(),
  subnet: varchar().unique(),
  localSubdomain: varchar('local_subdomain'),
  pendingRestart: boolean('pending_restart').default(false).notNull(),
  userConfigEnabled: boolean('user_config_enabled').default(true).notNull(),
  maxBackups: integer('max_backups'),
  templateUrn: varchar('template_urn'),
  lastTemplateSyncAt: integer('last_template_sync_at'),
  templateVersion: integer('template_version'),
});

export const appRelations = relations(app, ({ one }) => ({
  appStore: one(appStore, {
    fields: [app.appStoreSlug],
    references: [appStore.slug],
  }),
}));

export const appMigration = pgTable(
  'app_migration',
  {
    appId: integer('app_id')
      .notNull()
      .references(() => app.id, { onDelete: 'cascade' }),
    migrationId: varchar('migration_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.appId, table.migrationId] })],
);

export const appRestoreJournal = pgTable('app_restore_journal', {
  appId: integer('app_id')
    .primaryKey()
    .notNull()
    .references(() => app.id, { onDelete: 'cascade' }),
  previousState: jsonb('previous_state').$type<MigrationLedgerState>().notNull(),
  targetState: jsonb('target_state').$type<MigrationLedgerState>().notNull(),
  directories: jsonb('directories').$type<RestoreDirectory[]>().notNull(),
  phase: varchar().$type<RestorePhase>().default('prepared').notNull(),
});

export const user = pgTable('user', {
  id: serial().primaryKey().notNull(),
  username: varchar().notNull(),
  password: varchar().notNull(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())`),
  operator: boolean().default(false).notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  salt: text(),
  locale: varchar().default('en').notNull(),
  hasSeenWelcome: boolean('has_seen_welcome').default(false).notNull(),
});

export const appStore = pgTable('app_store', {
  slug: varchar().notNull().primaryKey(),
  hash: varchar().notNull().unique(),
  name: varchar({ length: 16 }).notNull(),
  enabled: boolean().default(true).notNull(),
  url: varchar().notNull(),
  branch: varchar().default('main').notNull(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())`),
});

export const oidcProviders = pgTable('oidc_providers', {
  id: serial().notNull().unique(),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  slug: varchar().notNull().primaryKey(),
  displayName: varchar().notNull(),
  clientId: varchar().notNull(),
  clientSecret: varchar().notNull(),
  issuer: varchar().notNull(),
  discovery: varchar().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const oidcTrustedSubs = pgTable('oidc_trusted_subs', {
  id: serial().notNull(),
  slug: varchar().notNull().primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  providerId: integer('provider_id')
    .notNull()
    .references(() => oidcProviders.id, { onDelete: 'cascade' }),
  sub: varchar().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
