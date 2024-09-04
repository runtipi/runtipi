import { z } from 'zod';

export const ARCHITECTURES = {
  ARM64: 'arm64',
  AMD64: 'amd64',
} as const;
export type Architecture = (typeof ARCHITECTURES)[keyof typeof ARCHITECTURES];

export const envSchema = z.object({
  NODE_ENV: z.union([z.literal('development'), z.literal('production'), z.literal('test')]),
  REDIS_HOST: z.string(),
  redisPassword: z.string(),
  architecture: z.nativeEnum(ARCHITECTURES),
  dnsIp: z.string().ip().trim(),
  internalIp: z.string(),
  version: z.string(),
  jwtSecret: z.string(),
  appsRepoId: z.string(),
  appsRepoUrl: z.string().url().trim(),
  domain: z.string().trim(),
  localDomain: z.string().trim(),
  timeZone: z
    .string()
    .trim()
    .optional()
    .default('Etc/GMT')
    .transform((value) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value }).resolvedOptions().timeZone === value;
        return value;
      } catch (error) {
        return 'Etc/GMT';
      }
    }),
  appDataPath: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value?.replace(/\s/g, '');
    }),
  mediaPath: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value?.replace(/\s/g, '');
    }),
  backupsPath: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value?.replace(/\s/g, '');
    }),
  userConfigPath: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      return value?.replace(/\s/g, '');
    }),
  postgresHost: z.string(),
  postgresDatabase: z.string(),
  postgresUsername: z.string(),
  postgresPassword: z.string(),
  postgresPort: z.number(),
  demoMode: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      return value === 'true';
    }),
  guestDashboard: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      return value === 'true';
    }),
  seePreReleaseVersions: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      return value === 'true';
    }),
  allowAutoThemes: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 'true';

      return true;
    }),
  allowErrorMonitoring: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 'true';

      return false;
    }),
  persistTraefikConfig: z
    .string()
    .or(z.boolean())
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 'true';

      return false;
    }),
});

export const settingsSchema = envSchema
  .partial()
  .pick({
    dnsIp: true,
    internalIp: true,
    postgresPort: true,
    appsRepoUrl: true,
    domain: true,
    localDomain: true,
    demoMode: true,
    guestDashboard: true,
    allowAutoThemes: true,
    allowErrorMonitoring: true,
    persistTraefikConfig: true,
    timeZone: true,
    appDataPath: true,
    mediaPath: true,
    backupsPath: true,
    userConfigPath: true,
  })
  .and(
    z
      .object({
        port: z.coerce.number(),
        sslPort: z.coerce.number(),
        listenIp: z.string().ip().trim(),
      })
      .partial(),
  );
