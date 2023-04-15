export const APP_STATUS = {
  INSTALLING: 'installing',
  MISSING: 'missing',
  RUNNING: 'running',
  STARTING: 'starting',
  STOPPED: 'stopped',
  STOPPING: 'stopping',
  UNINSTALLING: 'uninstalling',
  UPDATING: 'updating',
} as const;

export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS];

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

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES];
