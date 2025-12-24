import { APP_STATUS } from '@/core/database/drizzle/types';
import { AppInfoDto, MetadataDto } from '@/modules/marketplace/dto/marketplace.dto';
import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const appSchema = type({
  id: 'number',
  port: 'number | null',
  status: type.enumerated(...APP_STATUS),
  createdAt: 'number',
  updatedAt: 'number',
  version: 'number',
  exposed: 'boolean',
  openPort: 'boolean',
  exposedLocal: 'boolean',
  domain: 'string | null',
  isVisibleOnGuestDashboard: 'boolean',
  config: 'Record<string, unknown>?',
  enableAuth: 'boolean?',
  localSubdomain: type('string').or('null').optional(),
  pendingRestart: 'boolean',
  ignoredVersion: 'number | null',
});

const myAppsSchema = type({
  installed: type({
    app: appSchema,
    info: AppInfoDto.schema,
    metadata: MetadataDto.schema,
  }).array(),
});

const getAppSchema = type({
  app: appSchema.or('null').optional(),
  info: AppInfoDto.schema,
  metadata: MetadataDto.schema,
});

const getRandomPortSchema = type({
  port: 'number',
});

const getComposeDiff = type({
  current: 'string | null',
  new: 'string | null',
});

const getConfigDiffSchema = type({
  current: 'string | null',
  new: 'string | null',
});

export class AppDto extends createArkDto(appSchema, { name: 'AppDto' }) {}
export class MyAppsDto extends createArkDto(myAppsSchema, {
  name: 'MyAppsDto',
}) {}
export class GuestAppsDto extends createArkDto(myAppsSchema, {
  name: 'GuestAppsDto',
}) {}
export class GetAppDto extends createArkDto(getAppSchema, {
  name: 'GetAppDto',
}) {}
export class GetRandomPortDto extends createArkDto(getRandomPortSchema, {
  name: 'GetRandomPortDto',
}) {}
export class GetConfigDiffDto extends createArkDto(getConfigDiffSchema, {
  name: 'GetConfigDiffDto',
}) {}
export class GetComposeDiffDto extends createArkDto(getComposeDiff, {
  name: 'GetComposeDiffDto',
}) {}
