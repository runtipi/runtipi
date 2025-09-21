import { z } from 'zod';
import { type } from 'arktype';
import { arkAppUrn, zodAppUrn } from '../types/app-urn.js';

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
export const ARCHITECTURES = ['arm64', 'amd64'] as const;

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
  urn: zodAppUrn,
  available: z.boolean(),
  deprecated: z.boolean().optional().default(false),
  port: z.number().min(1).max(65535).optional(),
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
  force_pull: z.boolean().optional().default(false),
});

// ArkType equivalent schemas
export const formFieldSchemaArk = type({
  type: type.enumerated(...FIELD_TYPES),
  label: 'string',
  placeholder: 'string?',
  max: 'number?',
  min: 'number?',
  hint: 'string?',
  options: type({ label: 'string', value: 'string' }).array().optional(),
  required: 'boolean = false',
  default: type.or('boolean', 'string', 'number').optional(),
  regex: 'string?',
  pattern_error: 'string?',
  env_variable: 'string',
  encoding: type.enumerated(...RANDOM_ENCODINGS).optional(),
});

export const appInfoSchemaArk = type({
  id: type('string').narrow((v, ctx) => (v.split(':').length === 1 ? true : ctx.mustBe('a string without colons'))),
  urn: arkAppUrn,
  available: 'boolean',
  deprecated: 'boolean = false',
  port: '1 <= number <= 65535?',
  name: 'string',
  description: "string = ''",
  version: "string = 'latest'",
  tipi_version: 'number',
  short_desc: 'string',
  author: 'string',
  source: 'string',
  website: 'string?',
  force_expose: 'boolean = false',
  generate_vapid_keys: 'boolean = false',
  categories: type
    .enumerated(...APP_CATEGORIES)
    .array()
    .default(() => []),
  url_suffix: 'string?',
  form_fields: formFieldSchemaArk.array().default(() => []),
  https: 'boolean = false',
  exposable: 'boolean = false',
  no_gui: 'boolean = false',
  supported_architectures: type
    .enumerated(...ARCHITECTURES)
    .array()
    .optional(),
  uid: 'number?',
  gid: 'number?',
  dynamic_config: 'boolean = false',
  min_tipi_version: 'string?',
  created_at: type('number.integer >= 0')
    .narrow((v, ctx) => (v < Date.now() ? true : ctx.mustBe('a timestamp before now')))
    .default(0),
  updated_at: type('number.integer >= 0')
    .narrow((v, ctx) => (v < Date.now() ? true : ctx.mustBe('a timestamp before now')))
    .default(0),
  force_pull: 'boolean = false',
});

// Derived types
export type AppInfoInput = typeof appInfoSchemaArk.inferIn;
export type AppInfo = typeof appInfoSchemaArk.infer;
export type FormField = typeof formFieldSchemaArk.infer;
