import type { AppDetailsDto, GetAppBackupsDto, LinksDto, SearchAppsDto } from '@/api-client';

export type AppStatus = AppDetailsDto['app']['status'];
export type FormField = NonNullable<AppDetailsDto['info']['form_fields']>[number];
export type AppInfo = AppDetailsDto['info'];
export type AppUpdateInfo = AppDetailsDto['updateInfo'];
export type AppDetails = AppDetailsDto['app'];

export type AppInfoSimple = SearchAppsDto['data'][number];
export type AppCategory = NonNullable<AppInfoSimple['categories']>[number];

export type CustomLink = LinksDto['links'][number];

export type AppBackup = GetAppBackupsDto['data'][number];

export type UserConfig = AppDetailsDto['userConfig'];