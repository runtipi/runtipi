import { APP_CATEGORIES, appInfoSchema } from '@runtipi/common/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// App info
export class AppInfoSimpleDto extends createZodDto(
  appInfoSchema.pick({
    id: true,
    urn: true,
    name: true,
    short_desc: true,
    categories: true,
    deprecated: true,
    created_at: true,
    supported_architectures: true,
    available: true,
  }),
) {}

export class AppInfoDto extends createZodDto(appInfoSchema) {}

export class MetadataDto extends createZodDto(
  z.object({
    hasCustomConfig: z.boolean().optional(),
    localSubdomain: z.string(),
    latestVersion: z.number(),
    minTipiVersion: z.string().optional(),
    latestDockerVersion: z.string().optional(),
  }),
) {}

// Search apps
export class SearchAppsQueryDto extends createZodDto(
  z.object({
    search: z.string().optional(),
    pageSize: z.coerce.number().optional(),
    cursor: z.string().optional(),
    category: z.enum(APP_CATEGORIES).optional(),
    storeId: z.string().optional(),
  }),
) {}

export class SearchAppsDto extends createZodDto(
  z.object({
    data: AppInfoSimpleDto.schema.array(),
    nextCursor: z.string().optional(),
    total: z.number(),
  }),
) {}

export class AppDetailsDto extends createZodDto(
  z.object({
    info: AppInfoDto.schema,
    metadata: MetadataDto.schema,
  }),
) {}

// Pull
export class PullDto extends createZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

class AppStoreDto extends createZodDto(
  z.object({
    slug: z.string(),
    name: z.string(),
    url: z.string(),
    enabled: z.boolean(),
  }),
) {}

export class AllAppStoresDto extends createZodDto(
  z.object({
    appStores: z.array(AppStoreDto.schema),
  }),
) {}

export class UpdateAppStoreBodyDto extends createZodDto(
  z.object({
    name: z.string(),
    enabled: z.boolean(),
  }),
) {}

export class CreateAppStoreBodyDto extends createZodDto(
  z.object({
    name: z.string().min(1).max(16),
    url: z.string().trim().toLowerCase(),
  }),
) {}
