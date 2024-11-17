import { ARCHITECTURES } from '@/core/config/configuration.service';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
  id: z.string(),
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

// User compose
export const userComposeSchema = z.object({
  path: z.string(),
  content: z.string().nullable(),
});

// Derived types
export type AppInfo = z.output<typeof appInfoSchema>;
export type FormField = z.output<typeof formFieldSchema>;

// App info
export class AppInfoSimpleDto extends createZodDto(
  appInfoSchema.pick({
    id: true,
    name: true,
    short_desc: true,
    categories: true,
    deprecated: true,
    created_at: true,
    supported_architectures: true,
    available: true,
  }),
) {}

export class UserComposeDto extends createZodDto(userComposeSchema) {}

export class AppInfoDto extends createZodDto(appInfoSchema) {}
