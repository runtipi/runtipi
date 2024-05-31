import { z } from 'zod';
import { ARCHITECTURES } from './env-schemas';

export const APP_CATEGORIES = {
  NETWORK: 'network',
  MEDIA: 'media',
  DEVELOPMENT: 'development',
  AUTOMATION: 'automation',
  SOCIAL: 'social',
  UTILITIES: 'utilities',
  PHOTOGRAPHY: 'photography',
  SECURITY: 'security',
  FEATURED: 'featured',
  BOOKS: 'books',
  DATA: 'data',
  MUSIC: 'music',
  FINANCE: 'finance',
  GAMING: 'gaming',
  AI: 'ai',
} as const;

export type AppCategory = (typeof APP_CATEGORIES)[keyof typeof APP_CATEGORIES];

export const FIELD_TYPES = {
  TEXT: 'text',
  PASSWORD: 'password',
  EMAIL: 'email',
  NUMBER: 'number',
  FQDN: 'fqdn',
  IP: 'ip',
  FQDNIP: 'fqdnip',
  URL: 'url',
  RANDOM: 'random',
  BOOLEAN: 'boolean',
} as const;

export const formFieldSchema = z.object({
  type: z.nativeEnum(FIELD_TYPES).catch(() => FIELD_TYPES.TEXT),
  label: z.string(),
  placeholder: z.string().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  hint: z.string().optional(),
  options: z.object({ label: z.string(), value: z.string() }).array().optional(),
  required: z.boolean().optional().default(false),
  default: z.union([z.boolean(), z.string()]).optional(),
  regex: z.string().optional(),
  pattern_error: z.string().optional(),
  env_variable: z.string(),
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
  categories: z
    .nativeEnum(APP_CATEGORIES)
    .array()
    .catch(() => {
      return [APP_CATEGORIES.UTILITIES];
    }),
  url_suffix: z.string().optional(),
  form_fields: z.array(formFieldSchema).optional().default([]),
  https: z.boolean().optional().default(false),
  exposable: z.boolean().optional().default(false),
  no_gui: z.boolean().optional().default(false),
  supported_architectures: z.nativeEnum(ARCHITECTURES).array().optional(),
  uid: z.number().optional(),
  gid: z.number().optional(),
  dynamic_config: z.boolean().optional().default(false),
  min_tipi_version: z.string().optional(),
  createDirs: z.array(z.string()).optional()
});

// Derived types
export type AppInfo = z.infer<typeof appInfoSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
