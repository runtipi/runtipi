import { relations } from 'drizzle-orm';
import { boolean, customType, foreignKey, integer, pgEnum, pgTable, serial, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

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

export const link = pgTable(
  'link',
  {
    id: serial().primaryKey().notNull(),
    title: varchar({ length: 20 }).notNull(),
    url: varchar().notNull(),
    iconUrl: varchar('icon_url'),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    userId: integer('user_id').notNull(),
    description: varchar({ length: 50 }),
  },
  (table) => {
    return {
      fkLinkUserId: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: 'FK_link_user_id',
      }).onDelete('cascade'),
    };
  },
);

const appConfig = customType<{ data: Record<string, unknown>; driverData: string }>({
  dataType() {
    return 'jsonb';
  },
  toDriver(value: Record<string, unknown>): string {
    return JSON.stringify(value);
  },
});

export const app = pgTable(
  'app',
  {
    id: varchar().primaryKey().notNull(),
    status: appStatusEnum().default('stopped').notNull(),
    lastOpened: timestamp({ withTimezone: true, mode: 'string' }).defaultNow(),
    numOpened: integer().default(0).notNull(),
    config: appConfig('config').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    version: integer().default(1).notNull(),
    exposed: boolean().default(false).notNull(),
    domain: varchar(),
    isVisibleOnGuestDashboard: boolean('is_visible_on_guest_dashboard').default(false).notNull(),
    openPort: boolean('open_port').default(true).notNull(),
    exposedLocal: boolean('exposed_local').default(true).notNull(),
    appStoreId: integer('app_store_id').references(() => appStore.id),
  },
  (table) => {
    return {
      uq9478629Fc093D229Df09E560Aea: unique('UQ_9478629fc093d229df09e560aea').on(table.id),
    };
  },
);

export const appRelations = relations(app, ({ one }) => ({
  appStore: one(appStore, {
    fields: [app.appStoreId],
    references: [appStore.id],
  }),
}));

export const user = pgTable(
  'user',
  {
    id: serial().primaryKey().notNull(),
    username: varchar().notNull(),
    password: varchar().notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    operator: boolean().default(false).notNull(),
    totpSecret: text('totp_secret'),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    salt: text(),
    locale: varchar().default('en').notNull(),
    hasSeenWelcome: boolean('has_seen_welcome').default(false).notNull(),
  },
  (table) => {
    return {
      uq78A916Df40E02A9Deb1C4B75Edb: unique('UQ_78a916df40e02a9deb1c4b75edb').on(table.username),
    };
  },
);

export const appStore = pgTable('app_store', {
  id: serial().primaryKey().notNull(),
  hash: varchar().notNull().unique(),
  name: varchar().notNull(),
  enabled: boolean().default(true).notNull(),
  url: varchar().notNull(),
  branch: varchar().default('main').notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  deleted: boolean().default(false).notNull(),
});
