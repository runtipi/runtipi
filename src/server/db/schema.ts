import { InferModel } from 'drizzle-orm';
import { pgTable, pgEnum, integer, varchar, timestamp, serial, boolean, text, jsonb } from 'drizzle-orm/pg-core';

const APP_STATUS = {
  updating: 'updating',
  missing: 'missing',
  starting: 'starting',
  stopping: 'stopping',
  uninstalling: 'uninstalling',
  installing: 'installing',
  stopped: 'stopped',
  running: 'running',
} as const;
export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS];

export const updateStatusEnum = pgEnum('update_status_enum', ['SUCCESS', 'FAILED']);
export const appStatusEnum = pgEnum('app_status_enum', Object.values(APP_STATUS) as [string, ...string[]]);

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
});
export type User = InferModel<typeof userTable>;

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
  domain: varchar('domain'),
});
export type App = InferModel<typeof appTable>;
export type NewApp = InferModel<typeof appTable, 'insert'>;
