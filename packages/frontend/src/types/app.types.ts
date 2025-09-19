import type { GetAllAppStoresResponse, GetAppBackupsDto, GetAppDto, LinksDto, SearchAppsDto } from '@/api-client';

type NonUndefined<T> = T extends undefined ? never : T;

export type FormField = NonNullable<GetAppDto['info']['form_fields']>[number];
export type AppInfo = GetAppDto['info'];
export type AppMetadata = GetAppDto['metadata'];
export type AppDetails = NonNullable<GetAppDto['app']>;
export type AppStatus = NonUndefined<NonNullable<AppDetails>['status']>;

export type AppInfoSimple = SearchAppsDto['data'][number];
export type AppCategory = NonNullable<AppInfoSimple['categories']>[number];

export type CustomLink = LinksDto['links'][number];

export type AppBackup = GetAppBackupsDto['data'][number];

export type AppStore = GetAllAppStoresResponse['appStores'][number];
