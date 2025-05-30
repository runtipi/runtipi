# Dynamic Compose System

## Overview

The Dynamic Compose System is a core component of Runtipi that handles the
generation of Docker Compose configuration files at runtime. Instead of using
static Docker Compose files, Runtipi generates them dynamically based on
application configuration and user settings. This approach provides greater
flexibility and allows for runtime customization of containers.

## Technical Architecture

The system consists of several key components:

1. **Schema Definition** - The `dynamic-compose.ts` file defines the schema for
   Docker Compose configurations using Zod
2. **Service Builder** - The `ServiceBuilder` class builds individual service
   definitions
3. **Compose Builder** - The `DockerComposeBuilder` class assembles multiple
   services into a complete Docker Compose file
4. **App Lifecycle Commands** - Classes like `AppLifecycleCommand` that use the
   builders to generate Docker Compose files during app lifecycle events

## Schema Definition

The schema for Docker Compose configurations is defined in
`packages/common/src/schemas/dynamic-compose.ts`. This schema uses Zod for
runtime validation and type generation, providing both runtime safety and
TypeScript type definitions.

Key components of the schema include:

```typescript
export const serviceSchema = z.object({
    image: z.string(),
    name: z.string(),
    internalPort: z.number().or(z.string()).optional(),
    isMain: z.boolean().optional(),
    networkMode: z.string().optional(),
    // ... other properties
});

export const dynamicComposeSchema = z.object({
    services: serviceSchema.array(),
    overrides: z
        .array(
            z.object({
                architecture: z.enum(["arm64", "amd64"]).optional(),
                services: serviceSchema.partial().array(),
            }),
        )
        .optional(),
});

export type DependsOn = z.output<typeof dependsOnSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;
```

This schema defines the structure of services in a Docker Compose file and
exports TypeScript types for use throughout the application.

## Service Builder

The `ServiceBuilder` class in
`packages/backend/src/modules/docker/builders/service.builder.ts` implements a
builder pattern for Docker service configurations. This class:

- Provides methods for setting various Docker service properties (image, ports,
  volumes, environment variables, etc.)
- Validates that required properties are set
- Converts the internal representation to the format expected by Docker Compose
- Handles variable interpolation (e.g., replacing `{{RUNTIPI_APP_ID}}` with the
  actual app ID)

Example usage:

```typescript
const service = new ServiceBuilder()
    .setImage("nginx:latest")
    .setName("web")
    .setPort({ containerPort: 80, hostPort: 8080 })
    .setEnvironment({ NODE_ENV: "production" })
    .build();
```

## Compose Builder

The `DockerComposeBuilder` class in
`packages/backend/src/modules/docker/builders/compose.builder.ts` combines
multiple services into a complete Docker Compose configuration. This class:

- Processes service definitions from application configuration
- Adds networks with appropriate configuration
- Handles Traefik integration for exposed services
- Generates the final YAML configuration using the `yaml` library

The main entrypoint is the `getDockerCompose` method, which takes:

1. An array of service inputs (from the application's configuration)
2. Form inputs with user settings
3. The application URN
4. A subnet for the application's network

```typescript
public getDockerCompose = (
  services: ServiceInput[], 
  form: AppEventFormInput, 
  appUrn: AppUrn, 
  subnet: string
) => {
  // Process services, add networks, and build the final YAML
};
```

## Runtime Generation Process

The actual generation of Docker Compose files happens primarily in the
`AppLifecycleCommand` class. The `ensureAppDir` method:

1. Retrieves the application's Docker Compose JSON configuration
2. Parses and validates it using the `dynamicComposeSchema`
3. Gets the current system architecture
4. Applies any architecture-specific overrides to the services
5. Creates a `DockerComposeBuilder` instance
6. Allocates a subnet for the application
7. Generates the Docker Compose YAML file
8. Writes the file to disk for Docker to use

```typescript
try {
    const { services, overrides } = dynamicComposeSchema.parse(
        composeJson.content,
    );
    const architecture = configService.get("architecture");

    // Merge architecture-specific overrides with base services
    const mergedServices = mergeArchitectureOverrides(
        services,
        overrides,
        architecture,
    );

    const dockerComposeBuilder = new DockerComposeBuilder();
    const subnet = await subnetManager.allocateSubnet(appUrn);

    const composeFile = dockerComposeBuilder.getDockerCompose(
        mergedServices,
        form,
        appUrn,
        subnet,
    );

    await appFilesManager.writeDockerComposeYml(appUrn, composeFile);
} catch (err) {
    // Error handling
}
```

## Variable Interpolation

The system supports variable interpolation in several ways:

1. **Environment variables**: Standard Docker Compose environment variable
   syntax (e.g., `${APP_DATA_DIR}`)
2. **App ID interpolation**: Special syntax `{{RUNTIPI_APP_ID}}` is replaced
   with the app's identifier
3. **Form inputs**: User form inputs are passed to the generation process and
   can affect the output

## Network Configuration

The dynamic compose system automatically configures networking for applications:

1. Each application gets its own isolated network with a dedicated subnet
2. Main services or services with `addToMainNetwork: true` are connected to the
   main Tipi network
3. Services with `networkMode` set override the default networking behavior

## Architecture-Specific Overrides

The dynamic compose system supports architecture-specific service configurations
through overrides. This feature allows app developers to provide different
Docker images or configurations based on the host system's architecture (arm64
or amd64).

Key aspects of the architecture-specific overrides:

1. **Schema Definition**: The `dynamicComposeSchema` includes an optional
   `overrides` array where each override can specify an architecture and service
   modifications
2. **Runtime Merging**: During Docker Compose generation, the system detects the
   current architecture and merges any matching overrides with the base services
3. **Deep Merging**: Properties are deep-merged, with array properties being
   completely replaced rather than appended

Example configuration with architecture-specific overrides:

```json
{
    "services": [
        {
            "name": "app",
            "image": "app:latest",
            "isMain": true,
            "internalPort": 80
        },
        {
            "name": "db",
            "image": "mysql:latest"
        }
    ],
    "overrides": [
        {
            "architecture": "arm64",
            "services": [
                {
                    "name": "app",
                    "image": "app:arm64-latest"
                }
            ]
        }
    ]
}
```

In this example, when running on an arm64 system, the `app` service will use the
`app:arm64-latest` image instead of `app:latest`. All other properties from the
base service configuration are preserved.

## Traefik Integration

For applications that need to be exposed to the internet, the system
automatically adds Traefik routing configuration via labels:

1. Services marked as `isMain: true` can be exposed
2. The `TraefikLabelsBuilder` adds the appropriate labels for routing
3. Different exposure modes (local only, public, with authentication) are
   supported

## Error Handling

The system includes robust error handling:

1. Schema validation errors provide detailed information about configuration
   problems
2. Errors are reported to Sentry with appropriate context
3. User-friendly error messages are generated for the UI

## Best Practices for Contributors

When working with the dynamic compose system:

1. Use the Zod schema to validate Docker Compose configurations
2. Use the builder pattern for creating and modifying services
3. Test changes with a variety of applications to ensure compatibility
4. Be careful when modifying the schema as it may break existing apps
5. When using architecture-specific overrides:
   - Only specify the properties that need to be different for each architecture
   - Test on both architectures when possible
   - Consider backward compatibility for deployments without the overrides
     feature

## Examples

### Basic Service Configuration

```json
{
    "services": [
        {
            "name": "web",
            "image": "nginx:latest",
            "isMain": true,
            "internalPort": 80,
            "volumes": [
                {
                    "hostPath": "${APP_DATA_DIR}/html",
                    "containerPath": "/usr/share/nginx/html"
                }
            ]
        }
    ]
}
```

### Service with Dependencies

```json
{
    "services": [
        {
            "name": "wordpress",
            "image": "wordpress:latest",
            "isMain": true,
            "internalPort": 80,
            "environment": {
                "WORDPRESS_DB_HOST": "db",
                "WORDPRESS_DB_USER": "wordpress",
                "WORDPRESS_DB_PASSWORD": "${MYSQL_PASSWORD}",
                "WORDPRESS_DB_NAME": "wordpress"
            },
            "dependsOn": {
                "db": {
                    "condition": "service_healthy"
                }
            }
        },
        {
            "name": "db",
            "image": "mariadb:10.6",
            "environment": {
                "MYSQL_ROOT_PASSWORD": "${MYSQL_ROOT_PASSWORD}",
                "MYSQL_DATABASE": "wordpress",
                "MYSQL_USER": "wordpress",
                "MYSQL_PASSWORD": "${MYSQL_PASSWORD}"
            },
            "volumes": [
                {
                    "hostPath": "${APP_DATA_DIR}/db",
                    "containerPath": "/var/lib/mysql"
                }
            ],
            "healthCheck": {
                "test": "mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD}",
                "interval": "10s",
                "timeout": "5s",
                "retries": 5
            }
        }
    ]
}
```

### Architecture-Specific Overrides

```json
{
    "services": [
        {
            "name": "plex",
            "image": "linuxserver/plex:latest",
            "isMain": true,
            "internalPort": 32400,
            "volumes": [
                {
                    "hostPath": "${APP_DATA_DIR}/config",
                    "containerPath": "/config"
                },
                {
                    "hostPath": "${RUNTIPI_MEDIA_DIR}",
                    "containerPath": "/media"
                }
            ]
        }
    ],
    "overrides": [
        {
            "architecture": "arm64",
            "services": [
                {
                    "name": "plex",
                    "image": "linuxserver/plex:arm64v8-latest"
                }
            ]
        },
        {
            "architecture": "amd64",
            "services": [
                {
                    "name": "plex",
                    "image": "linuxserver/plex:amd64-latest",
                    "deploy": {
                        "resources": {
                            "reservations": {
                                "devices": [
                                    {
                                        "capabilities": ["gpu"]
                                    }
                                ]
                            }
                        }
                    }
                }
            ]
        }
    ]
}
```

In this example:

- The base configuration works for any architecture
- On arm64 systems, it uses a specific ARM-compatible image
- On amd64 systems, it uses an AMD64-specific image and adds GPU capabilities

## Conclusion

The Dynamic Compose System is a powerful feature of Runtipi that enables
flexible, runtime generation of Docker Compose configurations. By understanding
this system, contributors can develop new features and apps that leverage
Runtipi's infrastructure effectively.
