import type { AppDetailsDto, GetAllAppStoresResponse, GetAppBackupsDto, GetAppDto, LinksDto, SearchAppsDto } from '@/api-client';

export type FormField = NonNullable<AppDetailsDto['info']['form_fields']>[number];
export type AppInfo = AppDetailsDto['info'];
export type AppUpdateInfo = AppDetailsDto['updateInfo'];
export type AppDetails = NonNullable<GetAppDto['app']>;
export type AppStatus = NonNullable<AppDetails>['status'];

export type AppInfoSimple = SearchAppsDto['data'][number];
export type AppCategory = NonNullable<AppInfoSimple['categories']>[number];

export type CustomLink = LinksDto['links'][number];

export type AppBackup = GetAppBackupsDto['data'][number];

export type AppStore = GetAllAppStoresResponse['appStores'][number];
