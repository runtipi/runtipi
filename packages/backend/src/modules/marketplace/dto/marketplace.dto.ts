import { APP_CATEGORIES, appInfoSchema } from '@runtipi/common/schemas';
import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const metadataSchema = type({
  hasCustomConfig: 'boolean?',
  localSubdomain: 'string',
  latestVersion: 'number',
  minTipiVersion: type('string').or('null').optional(),
  latestDockerVersion: 'string?',
  composeSchemaVersion: 'number?',
});

const searchAppQuerySchema = type({
  search: 'string?',
  pageSize: type('number.integer | string.integer.parse').to('number').optional(),
  cursor: 'string?',
  category: type.enumerated(...APP_CATEGORIES).optional(),
  storeId: 'string?',
});

const simpleAppInfoSchema = appInfoSchema.pick(
  'id',
  'urn',
  'name',
  'short_desc',
  'categories',
  'deprecated',
  'created_at',
  'supported_architectures',
  'available',
);

const searchAppsResponseSchema = type({
  data: simpleAppInfoSchema.array(),
  nextCursor: type('string').or('null').optional(),
  total: 'number',
});

const appDetailsSchema = type({
  info: appInfoSchema,
  metadata: metadataSchema,
});

const successResponseSchema = type({
  success: 'boolean',
});

const appStoreSchema = type({
  slug: 'string',
  name: 'string',
  url: 'string',
  enabled: 'boolean',
});

const allAppStoresSchema = type({
  appStores: appStoreSchema.array(),
});

const updateAppStoreBodySchema = type({
  name: 'string',
  enabled: 'boolean',
});

const createAppStoreBodySchema = type({
  name: type('string').atLeastLength(1).atMostLength(16),
  url: 'string.url',
});

// App info
export class AppInfoSimpleDto extends createArkDto(simpleAppInfoSchema, { name: 'AppInfoSimpleDto' }) {}
export class AppInfoDto extends createArkDto(appInfoSchema, { name: 'AppInfoDto' }) {}
export class MetadataDto extends createArkDto(metadataSchema, { name: 'MetadataDto' }) {}

// Search apps
export class SearchAppsQueryDto extends createArkDto(searchAppQuerySchema, { name: 'SearchAppsQueryDto', input: true }) {}
export class SearchAppsDto extends createArkDto(searchAppsResponseSchema, { name: 'SearchAppsDto' }) {}
export class AppDetailsDto extends createArkDto(appDetailsSchema, { name: 'AppDetailsDto' }) {}

// Pull
export class PullDto extends createArkDto(successResponseSchema, { name: 'PullDto' }) {}

// App stores
export class AppStoreDto extends createArkDto(appStoreSchema, { name: 'AppStoreDto' }) {}
export class AllAppStoresDto extends createArkDto(allAppStoresSchema, { name: 'AllAppStoresDto' }) {}
export class UpdateAppStoreBodyDto extends createArkDto(updateAppStoreBodySchema, { name: 'UpdateAppStoreBodyDto', input: true }) {}
export class CreateAppStoreBodyDto extends createArkDto(createAppStoreBodySchema, { name: 'CreateAppStoreBodyDto', input: true }) {}
export class UpdateAppStoreDto extends createArkDto(successResponseSchema, { name: 'UpdateAppStoreDto' }) {}
