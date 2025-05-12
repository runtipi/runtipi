# General Settings System in Runtipi

This technical document describes how the general settings system works in
Runtipi, with a focus on how settings are defined, saved, and loaded between the
frontend and backend. This document is intended for Runtipi core contributors.

## Overview

The general settings system in Runtipi provides a way to configure the
application's behavior through user-configurable parameters. The system is built
on a well-defined schema that ensures type safety and validation both at runtime
and compile-time through the use of Zod schemas.

## Settings Schema Definition

The foundation of the general settings system is the `settingsSchema` defined in
`packages/backend/src/app.dto.ts`. This schema defines all configurable
parameters available in the system:

```typescript
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
    experimental_insecureCookie: z.boolean().optional(),
});
```

This schema is used to create two important DTOs:

- `UserSettingsDto` - Represents the full settings schema
- `PartialUserSettingsDto` - Represents a partial version of the settings where
  all fields are optional

These DTOs are used for type safety when transferring settings between different
parts of the application.

## Environment Variables and Settings

The `ConfigurationService` in
`packages/backend/src/core/config/configuration.service.ts` is responsible for
loading and managing settings. The service performs several important functions:

1. It defines an `envSchema` that parses environment variables into
   strongly-typed configuration values
2. It loads environment variables from the `.env` file located in the data
   directory
3. It initializes user settings based on environment variables
4. It provides methods to get and update settings

The relationship between environment variables and user settings is established
in the `configure()` method, which maps from environment variables to a
`userSettings` object:

```typescript
userSettings: {
  allowAutoThemes: env.data.ALLOW_AUTO_THEMES,
  allowErrorMonitoring: env.data.ALLOW_ERROR_MONITORING && process.env.NODE_ENV === 'production',
  demoMode: env.data.DEMO_MODE,
  guestDashboard: env.data.GUEST_DASHBOARD,
  timeZone: env.data.TZ,
  domain: env.data.DOMAIN,
  localDomain: env.data.LOCAL_DOMAIN,
  port: env.data.NGINX_PORT || 80,
  sslPort: env.data.NGINX_PORT_SSL || 443,
  listenIp: env.data.INTERNAL_IP,
  internalIp: env.data.INTERNAL_IP,
  appsRepoUrl: env.data.APPS_REPO_URL,
  postgresPort: env.data.POSTGRES_PORT,
  dnsIp: env.data.DNS_IP,
  appDataPath: env.data.RUNTIPI_APP_DATA_PATH,
  forwardAuthUrl: env.data.RUNTIPI_FORWARD_AUTH_URL,
  persistTraefikConfig: env.data.PERSIST_TRAEFIK_CONFIG,
  eventsTimeout: env.data.QUEUE_TIMEOUT_IN_MINUTES,
  advancedSettings: env.data.ADVANCED_SETTINGS,
  logLevel: env.data.LOG_LEVEL,
  experimental: {
    insecureCookie: env.data.EXPERIMENTAL_INSECURE_COOKIE,
  },
},
```

## Saving Settings

The `ConfigurationService` provides a `setUserSettings` method that handles
updating user settings:

```typescript
public async setUserSettings(settings: PartialUserSettingsDto) {
  if (this.config.demoMode) {
    throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
  }

  try {
    this.initSentry({ release: this.config.version, allowSentry: Boolean(settings.allowErrorMonitoring) });

    const settingsPath = path.join(DATA_DIR, 'state', 'settings.json');

    const fileContent = await fs.promises.readFile(settingsPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    const currentSettings = settingsSchema.partial().parse(parsedContent);

    await fs.promises.writeFile(settingsPath, `${JSON.stringify({ ...currentSettings, ...settings }, null, 2)}`, 'utf8');
    this.config.userSettings = { ...this.config.userSettings, ...settings };
  } catch (error) {
    this.logger.error('Failed to set user settings', error);
    throw new InternalServerErrorException('Failed to set user settings');
  }
}
```

Key points about the saving process:

1. Settings are not allowed to be changed in demo mode
2. Settings that affect Sentry (error monitoring) are immediately applied
3. Settings are read from and written to a JSON file at
   `DATA_DIR/state/settings.json`
4. The new settings are merged with existing settings
5. The in-memory configuration is updated to reflect the changes
6. Any errors are logged and an exception is thrown

## Frontend to Backend Flow

The general settings flow between the frontend and backend works as follows:

1. **Initial Loading**:
   - The backend loads settings from environment variables and the settings file
     on startup
   - The frontend receives the settings as part of the application context

2. **Frontend Display**:
   - Settings are displayed in the Settings page, which is loaded lazily
   - Different settings may be shown under different tabs (General, Security,
     etc.)
   - Some settings may be hidden behind an "Advanced Settings" toggle

3. **User Updates**:
   - When a user updates settings, the changes are validated on the frontend
   - The frontend makes a PATCH request to `/api/user-settings` with the changed
     values
   - The backend validates the incoming settings against the
     `PartialUserSettingsDto` schema
   - The `setUserSettings` method in `ConfigurationService` is called to save
     the changes
   - Feedback is provided to the user (success or error message)
   - Some settings changes may require a restart to take effect

4. **Context Refreshing**:
   - After settings are saved, the application context is refreshed
   - This updates the frontend with the new settings values
   - UI components that depend on settings (like themes) react to the changes

## Access to Settings

There are several ways to access settings in different parts of the application:

1. **Backend Services**:
   - Inject `ConfigurationService` and use `get('userSettings')` or
     `getConfig().userSettings`
   - Some specific settings might be injected directly, e.g., `eventsTimeout` in
     the `QueueModule`

2. **Frontend Components**:
   - Use the `useAppContext()` hook to access `userSettings`
   - Use the `useUserContext()` hook for settings that are also exposed in the
     user context

## Settings That Require Special Handling

Some settings have special handling:

1. **allowErrorMonitoring**: Controls whether Sentry error monitoring is
   enabled. When changed, the Sentry client is immediately updated.

2. **guestDashboard**: When enabled, allows non-authenticated users to see a
   limited dashboard with running apps.

3. **advancedSettings**: Controls whether advanced settings are visible in the
   UI. This is a UI-only setting that doesn't affect functionality directly.

4. **Settings requiring restart**: Some settings (like ports, IP addresses,
   etc.) require a restart to take effect. The UI should indicate this to users.

## Testing Settings

The e2e tests demonstrate how settings can be tested:

1. In `0005-guest-dashboard.spec.ts`, the `guestDashboard` setting is tested by:
   - Setting it in the UI
   - Logging out
   - Verifying that the guest dashboard is visible

2. The `setSettings` helper function can be used to set settings for tests:
   ```typescript
   await setSettings({
       // Add settings here
   });
   ```

## Best Practices

1. Always use the `settingsSchema` to define new settings
2. Use `PartialUserSettingsDto` when accepting settings updates
3. Provide clear feedback to users when settings require a restart
4. Validate settings on both frontend and backend
5. Document the purpose and impact of each setting

## Conclusion

The general settings system in Runtipi provides a robust way to configure the
application through a well-defined schema. Settings are saved to a file and
loaded on startup, with changes being applied through a well-defined API. The
system ensures type safety and validation at all stages of the process.
