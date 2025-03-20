import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { app, appStatusEnum, appStore, user } from './schema';

export const APP_STATUS = appStatusEnum.enumValues;
export type AppStatus = (typeof APP_STATUS)[number];

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type App = InferSelectModel<typeof app>;
export type NewApp = InferInsertModel<typeof app>;

export type AppStore = InferSelectModel<typeof appStore>;
export type NewAppStore = InferInsertModel<typeof appStore>;
