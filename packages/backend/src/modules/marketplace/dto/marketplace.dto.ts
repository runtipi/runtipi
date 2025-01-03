import { ARCHITECTURES } from '@/common/constants';
import type { AppUrn } from '@/types/app/app.types';
import { createZodDto } from 'nestjs-zod';
import { type ZodStringDef, z } from 'zod';

export const APP_CATEGORIES = [
  'network',
  'media',
  'development',
  'automation',
  'social',
  'utilities',
  'photography',
  'security',
  'featured',
  'books',
  'data',
  'music',
  'finance',
  'gaming',
  'ai',
] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

export const FIELD_TYPES = ['text', 'password', 'email', 'number', 'fqdn', 'ip', 'fqdnip', 'url', 'random', 'boolean'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const RANDOM_ENCODINGS = ['hex', 'base64'] as const;
export type RandomEncoding = (typeof RANDOM_ENCODINGS)[number];

export const formFieldSchema = z.object({
  type: z.enum(FIELD_TYPES),
  label: z.string(),
  placeholder: z.string().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  hint: z.string().optional(),
  options: z.object({ label: z.string(), value: z.string() }).array().optional(),
  required: z.boolean().optional().default(false),
  default: z.union([z.boolean(), z.string(), z.number()]).optional(),
  regex: z.string().optional(),
  pattern_error: z.string().optional(),
  env_variable: z.string(),
  encoding: z.enum(RANDOM_ENCODINGS).optional(),
});

export const appInfoSchema = z.object({
  id: z.string().refine((v) => v.split(':').length === 1),
  urn: z.string().refine((v) => v.split(':').length === 2) as unknown as z.ZodType<AppUrn, ZodStringDef>,
  available: z.boolean(),
  deprecated: z.boolean().optional().default(false),
  port: z.number().min(1).max(65535),
  name: z.string(),
  description: z.string().optional().default(''),
  version: z.string().optional().default('latest'),
  tipi_version: z.number(),
  short_desc: z.string(),
  author: z.string(),
  source: z.string(),
  website: z.string().optional(),
  force_expose: z.boolean().optional().default(false),
  generate_vapid_keys: z.boolean().optional().default(false),
  categories: z.enum(APP_CATEGORIES).array().default([]),
  url_suffix: z.string().optional(),
  form_fields: z.array(formFieldSchema).optional().default([]),
  https: z.boolean().optional().default(false),
  exposable: z.boolean().optional().default(false),
  no_gui: z.boolean().optional().default(false),
  supported_architectures: z.enum(ARCHITECTURES).array().optional(),
  uid: z.number().optional(),
  gid: z.number().optional(),
  dynamic_config: z.boolean().optional().default(false),
  min_tipi_version: z.string().optional(),
  created_at: z
    .number()
    .int()
    .min(0)
    .refine((v) => v < Date.now())
    .optional()
    .default(0),
  updated_at: z
    .number()
    .int()
    .min(0)
    .refine((v) => v < Date.now())
    .optional()
    .default(0),
});

// Derived types
export type AppInfoInput = z.input<typeof appInfoSchema>;
export type AppInfo = z.output<typeof appInfoSchema>;
export type FormField = z.output<typeof formFieldSchema>;

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
