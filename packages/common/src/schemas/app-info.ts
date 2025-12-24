import { type } from 'arktype';
import { arkAppUrn } from '../types/app-urn.js';

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

export const formFieldSchema = type({
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

export const appInfoSchema = type({
  id: type('string').narrow((v, ctx) => (v.split(':').length === 1 ? true : ctx.mustBe('a string without colons'))),
  urn: arkAppUrn,
  available: 'boolean',
  deprecated: 'boolean = false',
  port: '1 <= number <= 65535?',
  name: 'string',
  description: 'string = ""',
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
    .default(() => ['utilities']),
  url_suffix: 'string?',
  form_fields: formFieldSchema.array().default(() => []),
  https: 'boolean = false',
  exposable: 'boolean = false',
  no_gui: 'boolean = false',
  supported_architectures: type
    .enumerated(...ARCHITECTURES)
    .array()
    .default(() => ['amd64', 'arm64']),
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

export const frontmatterSchema = type({
  name: 'string?',
  short_desc: 'string?',
  description: 'string?',
  source: 'string?',
  website: 'string?',
  author: 'string?',
  categories: type
    .enumerated(...APP_CATEGORIES)
    .array()
    .default(() => ['development']),
  version: 'string?',
  port: '1 <= number <= 65535?',
  supported_architectures: type
    .enumerated(...ARCHITECTURES)
    .array()
    .default(() => ['amd64', 'arm64']),
});

// Derived types
export type AppInfoInput = typeof appInfoSchema.inferIn;
export type AppInfo = typeof appInfoSchema.infer;
export type FormField = typeof formFieldSchema.infer;
