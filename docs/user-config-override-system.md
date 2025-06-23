---
title: User Config Override System
---

# User Config Override System

The `user-config` override system is a powerful feature in Runtipi that allows core contributors and advanced users to granularly customize their Runtipi and application configurations. This system leverages Docker Compose's native override mechanism to provide a flexible way of modifying services, networks, and volumes without altering the core Runtipi files.

## Core Concept

The fundamental principle behind the `user-config` system is the use of multiple Docker Compose files. When `docker-compose` is run with multiple `-f` or `--file` flags, it merges the files in the order they are provided. Services, networks, or volumes defined in later files can extend or override those defined in earlier ones.

Runtipi uses this to layer user-provided configurations on top of the base configuration.

## Implementation Details

The `user-config` system is primarily managed by the `DockerService` located in `packages/backend/src/modules/docker/docker.service.ts`.

1.  **Volume Mounting**: The `docker-compose.prod.yml` file mounts the host directory `${RUNTIPI_USER_CONFIG_PATH:-.internal}/user-config` into the `runtipi` container at `/data/user-config`.

    ```yaml
    # docker-compose.prod.yml
    services:
      runtipi:
        volumes: // ...
          - ${RUNTIPI_USER_CONFIG_PATH:-.internal}/user-config:/data/user-config
          // ...
    ```

2.  **Configuration Detection**: The `DockerService` checks for the presence of specific files within the `/data/user-config` directory.

    - For **global Runtipi overrides**, it looks for `tipi-compose.yml`.
    - For **per-app overrides**, it looks for `docker-compose.yml` and `app.env` inside a structured path.

3.  **Dynamic Command Building**: When constructing `docker-compose` commands, the `DockerService` dynamically adds the user's configuration files if they exist.

    - `getBaseComposeArgsRuntipi`: Handles overrides for the core Runtipi services.
    - `getBaseComposeArgsApp`: Handles overrides for individual applications.

    If an override file is found, it is appended to the `docker-compose` arguments, ensuring it is processed after the base configuration file.

    ```typescript
    // packages/backend/src/modules/docker/docker.service.ts

    // For Runtipi core services
    const userComposeFile = path.join(
      dataDir,
      "user-config",
      "tipi-compose.yml"
    );
    if (await this.filesystem.pathExists(userComposeFile)) {
      args.push("--file", userComposeFile);
    }

    // For applications
    const userComposeFile = await this.appFilesManager.getUserComposeFile(
      appUrn
    );
    if (userComposeFile.content) {
      args.push("--file", userComposeFile.path);
    }
    ```

## Directory Structure

To use the override system, users must create a specific directory structure within their Runtipi installation folder (`.internal/user-config` by default).

```
.internal/
└── user-config/
    ├── tipi-compose.yml      # Global overrides for Runtipi services
    └── <app-store-id>/
        └── <app-name>/
            ├── docker-compose.yml # App-specific service overrides
            └── app.env            # App-specific environment variables
```

- **`tipi-compose.yml`**: This file can be used to override any of the core services defined in the main `docker-compose.prod.yml` (e.g., `runtipi`, `runtipi-db`, `runtipi-reverse-proxy`).
- **`<app-store-id>/<app-name>/docker-compose.yml`**: This file is for overriding services specific to a single application. The `<app-store-id>` and `<app-name>` must match the identifiers used by Runtipi.
- **`<app-store-id>/<app-name>/app.env`**: This file allows for the addition or override of environment variables for a specific application.

## Usage Examples

### Example 1: Changing Runtipi's Default Port

To change the main Runtipi web interface port from `80` to `8081`, a user can create the following `tipi-compose.yml`:

```yaml
# .internal/user-config/tipi-compose.yml
services:
  runtipi-reverse-proxy:
    ports:
      - 8081:80
      - 443:443
      - 8080:8080
```

### Example 2: Adding a Custom Volume to an App

To add a custom data volume to an application, for instance, `plex`, the user would create:

```yaml
# .internal/user-config/runtipi-official/plex/docker-compose.yml
services:
  plex:
    volumes:
      - /path/to/my/movies:/movies
```

This will be merged with the existing volumes defined for the Plex service.

## Important Considerations

- **Advanced Feature**: This system is intended for advanced users who are comfortable with Docker Compose. Incorrectly formatted files or invalid configurations can lead to unexpected behavior or prevent Runtipi from starting.
- **Debugging**: When a user-config is detected, Runtipi logs a warning. This is to remind users that their custom configuration might be the source of issues.
  ```
  User-config detected, please make sure your configuration is correct before opening an issue
  ```
- **Updates**: Users are responsible for maintaining their override files. A Runtipi update might introduce changes that conflict with a user's custom configuration.

## User Config Editor

Starting with version 4.0.0, Runtipi includes a user-friendly interface for managing app-specific user configurations directly from the web UI. This feature allows advanced users to edit their `docker-compose.yml` and `app.env` files without needing direct access to the server's file system.

### Accessing the User Config Editor

The User Config Editor can be accessed from each app's detail page:

1. Navigate to "My Apps" and select an app
2. Click on the "User Config" tab
3. You will see a toggle switch to enable/disable the user configuration for this app
4. Use the tabbed interface to edit either the `docker-compose.yml` or `app.env` files
5. Click "Save" to persist your changes

### Enable/Disable User Config

Each app has an independent flag to enable or disable its user configuration. When disabled, any custom configuration files for that app will be ignored during app startup, allowing you to quickly troubleshoot issues without deleting your configuration files.

### Security and Safety

The User Config Editor includes a warning message to remind users about the advanced nature of this feature. Incorrectly formatted YAML or environment variables can cause apps to fail on startup. Users should have a good understanding of Docker Compose and environment variable syntax before using this feature.

This system provides a high degree of flexibility for customizing a Runtipi instance, making it adaptable to a wide range of use cases and environments.
