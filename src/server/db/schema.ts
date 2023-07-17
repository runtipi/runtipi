import { InferModel } from 'drizzle-orm';
import { pgTable, pgEnum, integer, varchar, timestamp, serial, boolean, text, jsonb, bigint } from 'drizzle-orm/pg-core';

export const updateStatusEnum = pgEnum('update_status_enum', ['SUCCESS', 'FAILED']);
export const appStatusEnum = pgEnum('app_status_enum', ['running', 'stopped', 'starting', 'stopping', 'updating', 'missing', 'installing', 'uninstalling']);

const APP_STATUS = appStatusEnum.enumValues;
export type AppStatus = (typeof APP_STATUS)[number];

export const migrations = pgTable('migrations', {
  id: integer('id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  hash: varchar('hash', { length: 40 }).notNull(),
  executedAt: timestamp('executed_at', { mode: 'string' }).defaultNow(),
});

export const userTable = pgTable('user', {
  id: serial('id').primaryKey(),
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
export type User = InferModel<typeof userTable>;
export type NewUser = InferModel<typeof userTable, 'insert'>;

export const update = pgTable('update', {
  id: serial('id').notNull(),
  name: varchar('name').notNull(),
  status: updateStatusEnum('status').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().notNull(),
});

export const appTable = pgTable('app', {
  id: varchar('id').primaryKey(),
  status: appStatusEnum('status').default('stopped').notNull(),
  lastOpened: timestamp('lastOpened', { withTimezone: true, mode: 'string' }).defaultNow(),
  numOpened: integer('numOpened').default(0).notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  exposed: boolean('exposed').notNull(),
  domain: varchar('domain'),
});
export type App = InferModel<typeof appTable>;
export type NewApp = InferModel<typeof appTable, 'insert'>;

export const backupTable = pgTable('backup', {
  id: serial('id').notNull(),
  appId: varchar('app_id')
    .references(() => appTable.id)
    .notNull(),
  filename: varchar('filename').notNull(),
  version: varchar('version').notNull(),
  size: bigint('size', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'string' }).defaultNow().notNull(),
});
export type Backup = InferModel<typeof backupTable>;
export type NewBackup = InferModel<typeof backupTable, 'insert'>;
