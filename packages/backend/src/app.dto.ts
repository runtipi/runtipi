import { createZodDto } from 'nestjs-zod';
import { UserDto } from './modules/user/dto/user.dto';

import { z } from 'zod';
import { LOG_LEVEL_ENUM } from './core/logger/logger.service';
import { AppInfoSimpleDto } from './modules/marketplace/dto/marketplace.dto';

export const settingsSchema = z.object({
  dnsIp: z.string().ip().trim(),
  internalIp: z.string().ip().trim(),
  postgresPort: z.coerce.number(),
  appsRepoUrl: z.string().url().trim(),
  domain: z.string().trim(),
  appDataPath: z.string().trim(),
  localDomain: z.string().trim(),
  demoMode: z.boolean(),
  guestDashboard: z.boolean(),
  allowAutoThemes: z.boolean(),
  allowErrorMonitoring: z.boolean(),
  persistTraefikConfig: z.boolean(),
  port: z.coerce.number(),
  sslPort: z.coerce.number(),
  listenIp: z.string().ip().trim(),
  timeZone: z.string().trim(),
  eventsTimeout: z.coerce.number().int().min(1),
  advancedSettings: z.boolean(),
  forwardAuthUrl: z.string().url().trim(),
  logLevel: z.nativeEnum(LOG_LEVEL_ENUM),
  themeBase: z.string().optional(),
  themeColor: z.string().optional(),
  experimental_insecureCookie: z.boolean().optional(),
});

export class UserSettingsDto extends createZodDto(settingsSchema) {}
export class PartialUserSettingsDto extends createZodDto(settingsSchema.partial()) {}

export class AppContextDto extends createZodDto(
  z.object({
    version: z.object({ current: z.string(), latest: z.string(), body: z.string() }),
    userSettings: UserSettingsDto.schema,
    user: UserDto.schema,
    apps: AppInfoSimpleDto.schema.array(),
    updatesAvailable: z.number(),
  }),
) {}

export class UserContextDto extends createZodDto(
  z.object({
    version: z.object({ current: z.string(), latest: z.string(), body: z.string() }),
    isLoggedIn: z.boolean().describe('Indicates if the user is logged in'),
    isConfigured: z.boolean().describe('Indicates if the app is already configured'),
    isGuestDashboardEnabled: z.boolean().describe('Indicates if the guest dashboard is enabled'),
    allowAutoThemes: z.boolean().describe('Indicates if the app allows auto themes'),
    allowErrorMonitoring: z.boolean().describe('Indicates if the app allows anonymous error monitoring'),
    themeColor: z.string().describe('The theme color of the app'),
    themeBase: z.string().describe('The base theme of the app'),
    localDomain: z.string().describe('The configured local domain'),
  }),
) {}

export class AcknowledgeWelcomeBody extends createZodDto(z.object({ allowErrorMonitoring: z.boolean() })) {}
