import { createZodDto } from 'nestjs-zod';
import { UserDto } from './modules/user/dto/user.dto';

import { z } from 'zod';
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
  }),
) {}

export class AcknowledgeWelcomeBody extends createZodDto(z.object({ allowErrorMonitoring: z.boolean() })) {}
