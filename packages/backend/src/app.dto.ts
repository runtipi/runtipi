import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

import { UserDto } from './modules/user/dto/user.dto';

import { LOG_LEVEL_ENUM } from './core/logger/logger.service';
import { AppInfoSimpleDto } from './modules/marketplace/dto/marketplace.dto';

export const settingsSchema = type({
  advancedSettings: 'boolean',
  allowAutoThemes: 'boolean',
  allowErrorMonitoring: 'boolean',
  appDataPath: 'string.trim',
  appsRepoUrl: 'string.url',
  demoMode: 'boolean',
  dnsIp: 'string.ip.v4',
  domain: 'string.trim',
  eventsTimeout: type('number.integer | string.integer.parse').to('1 <= number <= 120'),
  forwardAuthUrl: 'string.url',
  guestDashboard: 'boolean',
  internalIp: 'string.ip.v4',
  listenIp: 'string.ip.v4',
  localDomain: 'string.trim',
  logLevel: type.enumerated(...Object.values(LOG_LEVEL_ENUM)),
  persistTraefikConfig: 'boolean',
  port: type('number.integer | string.integer.parse').to('0 <= number <= 65535'),
  postgresPort: type('number.integer | string.integer.parse').to('0 <= number <= 65535'),
  sslPort: type('number.integer | string.integer.parse').to('0 <= number <= 65535'),
  timeZone: 'string.trim',
  experimental_insecureCookie: 'boolean?',
  themeBase: 'string?',
  themeColor: 'string?',
});

const versionSchema = type({
  current: 'string',
  latest: 'string',
  body: 'string',
  releases: type({ version: 'string', body: 'string' }).array(),
});

const appContextSchema = type({
  version: versionSchema,
  userSettings: settingsSchema,
  user: UserDto.schema,
  apps: AppInfoSimpleDto.schema.array(),
  updatesAvailable: 'number',
});

export class UserSettingsDto extends createArkDto(settingsSchema, { name: 'UserSettingsDto' }) {}

export class UserSettingsBody extends createArkDto(settingsSchema.partial(), { name: 'PartialUserSettingsDto', input: true }) {}

export class AppContextDto extends createArkDto(appContextSchema, { name: 'AppContextDto' }) {}

const userContextDto = type({
  version: {
    current: 'string',
    latest: 'string',
    body: 'string',
    releases: type({ version: 'string', body: 'string' }).array(),
  },
  isLoggedIn: 'boolean',
  isConfigured: 'boolean',
  isGuestDashboardEnabled: 'boolean',
  allowAutoThemes: 'boolean',
  allowErrorMonitoring: 'boolean',
  themeColor: 'string',
  themeBase: 'string',
  localDomain: 'string',
  sslPort: 'number',
});

export class UserContextDto extends createArkDto(userContextDto, { name: 'UserContextDto' }) {}

export class AcknowledgeWelcomeBody extends createArkDto(type({ allowErrorMonitoring: 'boolean' }), { name: 'AcknowledgeWelcomeBody' }) {}
