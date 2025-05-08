# App Settings System in Runtipi

This document details the architecture and implementation of the per-app
settings system in Runtipi for core contributors.

## Overview

The Runtipi app settings system allows each individual app to define, collect,
validate, and store its own configuration parameters. These settings are used to
configure the app's behavior, environment variables, and integration with the
platform.

## Architecture

### App Settings Storage and Schema

Per-app settings in Runtipi follow a multi-layered approach:

1. **Schema Definition**: App settings are defined in the app's `config.json`
   file using the `form_fields` property
2. **Database Storage**: App configuration is stored in the `app` table's
   `config` column as JSONB data
3. **Environment File**: Settings are also stored as environment variables in
   app-specific `.env` files
4. **Runtime Access**: Settings are loaded when the app starts and injected into
   the container environment

### Key Components

#### 1. App Configuration Schema

App settings are defined in the app's `config.json` file using the `form_fields`
array. Each field uses the `formFieldSchema` defined in
`/packages/common/src/schemas/app-info.ts`:

```ts
export const formFieldSchema = z.object({
    type: z.enum(FIELD_TYPES),
    label: z.string(),
    placeholder: z.string().optional(),
    max: z.number().optional(),
    min: z.number().optional(),
    hint: z.string().optional(),
    options: z.object({ label: z.string(), value: z.string() }).array()
        .optional(),
    required: z.boolean().optional().default(false),
    default: z.union([z.boolean(), z.string(), z.number()]).optional(),
    regex: z.string().optional(),
    pattern_error: z.string().optional(),
    env_variable: z.string(),
    encoding: z.enum(RANDOM_ENCODINGS).optional(),
});
```

Example app configuration with form fields:

```json
{
    "id": "example-app",
    "name": "Example App",
    "version": "1.0.0",
    "form_fields": [
        {
            "type": "text",
            "label": "API Key",
            "env_variable": "API_KEY",
            "required": true,
            "hint": "Your API key for authentication"
        },
        {
            "type": "number",
            "label": "Port",
            "env_variable": "CUSTOM_PORT",
            "default": 8080,
            "min": 1024,
            "max": 65535
        }
    ]
}
```

The supported field types include:

- `text`: Simple text input
- `password`: Sensitive information, masked input
- `email`: Email address with validation
- `number`: Numeric input with optional range limits
- `fqdn`: Fully Qualified Domain Name
- `ip`: IP address
- `fqdnip`: Either FQDN or IP address
- `url`: URL with validation
- `random`: Generates random values with specified encoding
- `boolean`: True/false toggle

#### 2. App Installation & Configuration Flow

When a user installs an app:

1. The app's `config.json` is read from the app store repository
2. Form fields are extracted and presented to the user in the installation form
3. User input is validated against the field schema
4. Valid configurations are saved in the database in the `app` table
5. An `app.env` file is generated with the environment variables

#### 3. Database Storage

App configurations are stored in the PostgreSQL database using the `app` table:

```ts
// In core/database/drizzle/schema.ts
const appConfig = customType<
    { data: Record<string, unknown>; driverData: string }
>({
    dataType() {
        return "jsonb";
    },
    toDriver(value: Record<string, unknown>): string {
        return JSON.stringify(value);
    },
});

export const app = pgTable("app", {
    id: serial().primaryKey().notNull(),
    // ...other fields
    config: appConfig("config").notNull(),
    // App-specific settings columns
    exposed: boolean().default(false).notNull(),
    domain: varchar(),
    isVisibleOnGuestDashboard: boolean("is_visible_on_guest_dashboard").default(
        false,
    ).notNull(),
    openPort: boolean("open_port").default(true).notNull(),
    port: integer(),
    exposedLocal: boolean("exposed_local").default(true).notNull(),
    enableAuth: boolean("enable_auth").default(false).notNull(),
    localSubdomain: varchar("local_subdomain"),
    // ...more fields
});
```

The `config` column stores the complete JSON configuration provided by the user
during installation.

#### 4. Environment Variable Generation

The `AppFilesManager` in
`/packages/backend/src/modules/apps/app-files-manager.ts` handles generating and
managing environment variables for each app:

```ts
public async getAppEnv(appUrn: AppUrn) {
  const { appDataDir } = this.getAppPaths(appUrn);
  const envPath = path.join(appDataDir, 'app.env');

  let env = '';
  if (await this.filesystem.pathExists(envPath)) {
    env = (await this.filesystem.readTextFile(envPath)) ?? '';
  }

  return { path: envPath, content: env };
}

public async writeAppEnv(appUrn: AppUrn, env: string) {
  const { appDataDir } = this.getAppPaths(appUrn);
  const envPath = path.join(appDataDir, 'app.env');
  await this.filesystem.writeTextFile(envPath, env);
}
```

The `AppHelpers` in `/packages/backend/src/modules/apps/app.helpers.ts`
generates the environment variables from the app configuration:

```ts
// Environment mapping logic (simplified)
const appEnv = await this.appFilesManager.getAppEnv(appUrn);
const existingAppEnvMap = this.envUtils.envStringToMap(appEnv.content);

// Process each form field and add to environment
for (const field of config.form_fields || []) {
    if (field.env_variable) {
        // Get value from user input or default
        const value = userConfig[field.env_variable] || field.default;
        envMap.set(field.env_variable, String(value));
    }
}
```

## Core App Settings

In addition to app-specific custom settings defined in `form_fields`, Runtipi
provides several core settings that apply to most apps. These settings are
managed through the database and have special handling in the platform.

### Domain Settings

#### 1. Custom Domain (domain)

The `domain` field allows an app to be accessible via a custom domain name:

```ts
domain: varchar(), // Stored in the app table
```

When set:

- Runtipi configures Traefik to route traffic from this domain to the app
- SSL certificates are automatically provisioned via Let's Encrypt
- The app becomes accessible at `https://domain.com` instead of through the
  Runtipi dashboard

Usage workflow:

1. User enables "Exposed" option for the app
2. User enters a domain name (e.g., `myapp.example.com`)
3. DNS records must point to the Runtipi server's IP address
4. Runtipi configures Traefik reverse proxy to handle the routing

Implementation details:

```ts
// In AppLifecycleService
await this.db.update(app).set({
    exposed: form.exposed,
    domain: form.exposed ? form.domain : null,
    // Other fields...
}).where(eq(app.id, appId));

// Generate Traefik configuration
if (appEntity.exposed && appEntity.domain) {
    // Configure Traefik labels for external domain
    labels = {
        ...labels,
        "traefik.enable": "true",
        "traefik.http.routers.app-external.rule":
            `Host(\`${appEntity.domain}\`)`,
        "traefik.http.routers.app-external.entrypoints": "websecure",
        "traefik.http.routers.app-external.tls": "true",
        "traefik.http.routers.app-external.tls.certresolver": "letsencrypt",
    };
}
```

#### 2. Local Subdomain (localSubdomain)

The `localSubdomain` field enables accessing apps via a local subdomain (without
public internet):

```ts
localSubdomain: varchar('local_subdomain'), // Stored in the app table
```

When set:

- Apps are accessible via `{subdomain}.{local-domain}` (e.g., `myapp.tipi.lan`)
- This works on local networks without needing public DNS
- Makes apps available at predictable URLs instead of IP:port combinations

Usage workflow:

1. User enables "Exposed locally" option for the app
2. User enters a subdomain name (e.g., `myapp`)
3. Runtipi configures Traefik to route `myapp.tipi.lan` to the app
4. Local DNS resolution happens via mDNS or hosts file entries

Implementation details:

```ts
// In AppLifecycleService
await this.db.update(app).set({
    exposedLocal: form.exposedLocal,
    localSubdomain: form.exposedLocal ? form.localSubdomain : null,
    // Other fields...
}).where(eq(app.id, appId));

// Generate Traefik configuration
if (appEntity.exposedLocal && appEntity.localSubdomain) {
    // Configure Traefik labels for local domain
    const localDomain = config.userSettings.localDomain || "tipi.lan";
    const localFqdn = `${appEntity.localSubdomain}.${localDomain}`;

    labels = {
        ...labels,
        "traefik.enable": "true",
        "traefik.http.routers.app-local.rule": `Host(\`${localFqdn}\`)`,
        "traefik.http.routers.app-local.entrypoints": "web,websecure",
        "traefik.http.routers.app-local.tls": "true",
    };
}
```

The local subdomain feature includes validation to ensure valid hostnames:

```ts
// Frontend validation
localSubdomain: z.string().regex(/^[a-zA-Z0-9-]{1,63}$/).optional(),

// Backend validation in API schema
localSubdomain: z.string().pattern(/^[a-zA-Z0-9-]{1,63}$/).optional(),
```

### Port Management

#### 1. Port Assignment (port)

The `port` field controls which port the app is accessible on:

```ts
port: integer(), // Stored in the app table
```

When set:

- Runtipi maps the internal container port to this external port
- Useful for apps that need a specific port for external access
- Can be automatically assigned if not specified

Usage workflow:

1. User can specify a custom port during app installation
2. If not provided, Runtipi will auto-assign an available port
3. Ports are validated to ensure they don't conflict

Implementation details:

```ts
// Port assignment logic (simplified)
if (form.port && form.openPort) {
    // Use user-specified port
    port = form.port;
} else if (form.openPort) {
    // Auto-assign available port
    port = await this.portManager.getAvailablePort();
} else {
    // No port needed
    port = null;
}

await this.db.update(app).set({
    openPort: form.openPort,
    port: port,
    // Other fields...
}).where(eq(app.id, appId));
```

#### 2. Port Exposure (openPort)

The `openPort` boolean controls whether the app's port is exposed:

```ts
openPort: boolean('open_port').default(true).notNull(),
```

When enabled:

- The app's port is mapped to the host
- Makes the app accessible via IP:port
- Can be disabled for internal-only apps

### Authentication Settings

#### Enable Auth (enableAuth)

The `enableAuth` setting allows tying app access to Runtipi authentication:

```ts
enableAuth: boolean('enable_auth').default(false).notNull(),
```

When enabled:

- Users must be logged into Runtipi to access the app
- Runtipi's authentication middleware protects the app
- Useful for adding authentication to apps that don't have their own

Implementation details:

```ts
// In AppLifecycleService
await this.db.update(app).set({
    enableAuth: form.enableAuth,
    // Other fields...
}).where(eq(app.id, appId));

// Traefik middleware configuration
if (appEntity.enableAuth) {
    labels = {
        ...labels,
        "traefik.http.routers.app-external.middlewares": "auth-middleware@file",
        "traefik.http.routers.app-local.middlewares": "auth-middleware@file",
    };
}
```

### Guest Dashboard Visibility

The `isVisibleOnGuestDashboard` setting controls whether an app appears on the
guest dashboard:

```ts
isVisibleOnGuestDashboard: boolean('is_visible_on_guest_dashboard').default(false).notNull(),
```

When enabled:

- The app appears on the guest dashboard without requiring login
- Useful for apps that should be publicly accessible
- Works in conjunction with the global guest dashboard setting

### UI Representation

These core settings are represented in the app installation/edit form with
dedicated UI sections:

```tsx
// Simplified representation of domain settings UI
<FormSection title="Domain Settings">
    <Switch
        label="Expose app to the internet"
        description="Allow access to this app from the internet with a domain name"
        {...register("exposed")}
    />

    {watchExposed && (
        <TextInput
            label="Domain name"
            description="The domain that will point to this app (e.g., app.example.com)"
            {...register("domain")}
        />
    )}

    <Switch
        label="Expose app locally"
        description="Allow access to this app from your local network"
        {...register("exposedLocal")}
    />

    {watchExposedLocal && (
        <TextInput
            label="Local subdomain"
            description={`This app will be available at ${
                watchLocalSubdomain || "subdomain"
            }.${localDomain}`}
            {...register("localSubdomain")}
        />
    )}
</FormSection>;
```

### Best Practices When Using Core Settings

1. **Domain Configuration**:
   - Always validate domain and subdomain inputs
   - Use HTTPS whenever possible for security
   - Handle domain changes properly by reconfiguring the app

2. **Port Management**:
   - Avoid hardcoding ports in apps when possible
   - Use environment variables to pass port information
   - Support both port-based access and domain-based access

3. **Authentication Integration**:
   - Document whether an app supports Runtipi authentication
   - Consider security implications when disabling authentication
   - Test authentication flows thoroughly

4. **Testing Core Settings**:
   - Test domain routing with both custom domains and local subdomains
   - Verify port allocation and conflicts
   - Test authentication flows with and without auth enabled

## Settings Lifecycle

### Installation & Configuration

1. User selects an app to install from the app store
2. The system reads the app's `config.json` and extracts form fields
3. The frontend generates a form based on these fields
4. User fills in the required configuration
5. On submission, the `AppLifecycleService` processes the installation:
   - Validates user input against the field schema
   - Stores the configuration in the database
   - Generates the app.env file with environment variables
   - Starts the app with the provided configuration

### Accessing Configuration

When an app runs, it can access its configuration in several ways:

1. **Environment Variables**: Primary method - app reads values from environment
2. **Docker Compose**: Some settings affect the Docker Compose configuration

### Updating Configuration

When a user updates an app's configuration:

1. Current settings are loaded from the database
2. The form is pre-filled with existing values
3. User modifies the configuration
4. On submission, the app is restarted with the new configuration after:
   - Validation of the new values
   - Updating the database record
   - Regenerating the environment file

```ts
// Example of app configuration update flow
async updateAppConfig(appUrn: AppUrn, form: AppFormBody) {
  // Validate form data
  // Update config in database
  await this.db.update(app).set({
    config: { ...existingConfig, ...newConfig },
    // Update other app settings
  }).where(eq(app.urn, appUrn));
  
  // Generate new environment variables
  await this.appHelpers.generateAppEnv(appUrn, form);
  
  // Restart the app to apply changes
  await this.restartApp(appUrn);
}
```

## Special Field Types

### Random Value Generation

The `random` field type allows apps to generate secure random values:

```json
{
    "type": "random",
    "label": "JWT Secret",
    "env_variable": "JWT_SECRET",
    "encoding": "base64",
    "hint": "Automatically generated secret key"
}
```

The system will generate a random value if not already set:

```ts
if (field.type === "random" && !existingValue) {
    const encoding = field.encoding || "hex";
    const value = crypto.randomBytes(32).toString(encoding);
    envMap.set(field.env_variable, value);
}
```

### VAPID Keys

For apps requiring Web Push notifications, Runtipi can generate VAPID keys:

```ts
if (config.generate_vapid_keys) {
    if (
        existingAppEnvMap.has("VAPID_PUBLIC_KEY") &&
        existingAppEnvMap.has("VAPID_PRIVATE_KEY")
    ) {
        // Use existing keys if available
        envMap.set(
            "VAPID_PUBLIC_KEY",
            existingAppEnvMap.get("VAPID_PUBLIC_KEY") as string,
        );
        envMap.set(
            "VAPID_PRIVATE_KEY",
            existingAppEnvMap.get("VAPID_PRIVATE_KEY") as string,
        );
    } else {
        // Generate new keys
        const vapidKeys = this.envUtils.generateVapidKeys();
        envMap.set("VAPID_PUBLIC_KEY", vapidKeys.publicKey);
        envMap.set("VAPID_PRIVATE_KEY", vapidKeys.privateKey);
    }
}
```

## User Configuration Customization

For advanced users, Runtipi allows direct editing of app configurations:

1. **User Compose File**: Custom Docker Compose overrides
2. **User Environment File**: Additional environment variables

These files are stored in:

- `/data/user-config/{app-store-id}/{app-name}/`

And are preserved during app updates and backups.

## Backups and Restore

App settings are included in backups:

```ts
// Backup logic for app settings
const userConfigDir = path.join(dataDir, "user-config", appStoreId, appName);

if (await this.filesystem.pathExists(userConfigDir)) {
    this.logger.info("Including user configuration in backup...");
    await this.filesystem.copyDirectory(
        userConfigDir,
        path.join(tempDir, "user-config"),
    );
}
```

During restore, these settings are applied back to the app.

## Best Practices for Core Contributors

### Defining App Settings

When creating a new app or adding settings to an existing app:

1. Use the most appropriate field type for each setting
2. Provide clear labels and helpful hints for users
3. Set sensible default values where applicable
4. Mark fields as required if they must be provided
5. Use validation (min/max, regex) to ensure valid input
6. Keep the form_fields array organized by logical groups

### App Schema Best Practices

```json
{
    "form_fields": [
        {
            "type": "text",
            "label": "Username",
            "placeholder": "admin",
            "env_variable": "APP_USERNAME",
            "required": true,
            "hint": "Username for the administrative account"
        },
        {
            "type": "password",
            "label": "Password",
            "env_variable": "APP_PASSWORD",
            "required": true,
            "hint": "Minimum 8 characters",
            "regex": "^.{8,}$",
            "pattern_error": "Password must be at least 8 characters"
        }
    ]
}
```

### Testing App Settings

When testing app settings:

1. Verify that form validation works as expected
2. Test that environment variables are correctly generated
3. Ensure the app correctly uses the provided configuration
4. Test updating settings and verify changes are applied
5. Test backup and restore functionality

### Handling Sensitive Information

For sensitive information like passwords and API keys:

1. Always use the `password` type for sensitive fields
2. Never log sensitive values in app logs
3. Don't display sensitive values in the UI after submission
4. Consider encryption for highly sensitive values

## Related Components

### App Form Component

The frontend renders app configuration forms using the schema definition:

```tsx
// Dynamic form generation based on app form_fields
{
    formFields.map((field) => {
        switch (field.type) {
            case "text":
                return (
                    <TextInput
                        label={field.label}
                        hint={field.hint}
                        {...field}
                    />
                );
            case "password":
                return (
                    <PasswordInput
                        label={field.label}
                        hint={field.hint}
                        {...field}
                    />
                );
            case "number":
                return (
                    <NumberInput
                        label={field.label}
                        min={field.min}
                        max={field.max}
                        hint={field.hint}
                        {...field}
                    />
                );
                // Other field types...
        }
    });
}
```

### Form Validation

Frontend validation uses the same schema defined in the app:

```tsx
// Example form validation
const schema = useMemo(() => {
    const shape: Record<string, ZodTypeAny> = {};

    for (const field of formFields) {
        // Build validation schema based on field type and constraints
        if (field.type === "text") {
            let validator = z.string();
            if (field.regex) {
                validator = validator.regex(
                    new RegExp(field.regex),
                    field.pattern_error,
                );
            }
            if (field.required) {
                validator = validator.min(1, "This field is required");
            }
            shape[field.env_variable] = validator;
        }
        // Similar validation for other field types
    }

    return z.object(shape);
}, [formFields]);
```
