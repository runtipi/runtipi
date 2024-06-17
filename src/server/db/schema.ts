import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, pgEnum, integer, varchar, timestamp, serial, boolean, text, jsonb } from 'drizzle-orm/pg-core';

const updateStatusEnum = pgEnum('update_status_enum', ['SUCCESS', 'FAILED']);
const appStatusEnum = pgEnum('app_status_enum', [
  'running',
  'stopped',
  'starting',
  'stopping',
  'updating',
  'missing',
  'installing',
  'uninstalling',
  'resetting',
  'restarting',
  'backingup',
  'restoring',
]);

const APP_STATUS = appStatusEnum.enumValues;
export type AppStatus = (typeof APP_STATUS)[number];

export const migrations = pgTable('migrations', {
  id: integer('id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  hash: varchar('hash', { length: 40 }).notNull(),
  executedAt: timestamp('executed_at', { mode: 'string' }).defaultNow(),
});

export const userTable = pgTable('user', {
  id: serial('id').notNull(),
  username: varchar('username').notNull(),
  password: varchar('password').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().notNull(),
  operator: boolean('operator').default(false).notNull(),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  salt: text('salt'),
  locale: varchar('locale').default('en').notNull(),
});
export type User = InferSelectModel<typeof userTable>;
export type NewUser = InferInsertModel<typeof userTable>;

export const update = pgTable('update', {
  id: serial('id').notNull(),
  name: varchar('name').notNull(),
  status: updateStatusEnum('status').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().notNull(),
});

export const appTable = pgTable('app', {
  id: varchar('id').notNull(),
  status: appStatusEnum('status').default('stopped').notNull(),
  lastOpened: timestamp('lastOpened', { withTimezone: true, mode: 'string' }).defaultNow(),
  numOpened: integer('numOpened').default(0).notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  exposed: boolean('exposed').notNull(),
  exposedLocal: boolean('exposed_local').notNull(),
  openPort: boolean('open_port').notNull(),
  domain: varchar('domain'),
  isVisibleOnGuestDashboard: boolean('is_visible_on_guest_dashboard').default(false).notNull(),
});

export const linkTable = pgTable('link', {
  id: serial('id').notNull(),
  title: varchar('title', { length: 20 }).notNull(),
  description: varchar('description', { length: 50 }),
  url: varchar('url').notNull(),
  iconUrl: varchar('icon_url'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => userTable.id, { onDelete: 'cascade' }),
});

export type App = InferSelectModel<typeof appTable>;
export type NewApp = InferInsertModel<typeof appTable>;
export type Link = InferSelectModel<typeof linkTable>;
