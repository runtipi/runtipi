# Runtipi System Patterns

## System Architecture

Runtipi uses a containerized architecture with several key components working together:

1. **Core Container**: The main Runtipi application that provides the web interface and manages the ecosystem
2. **Traefik**: Handles routing, SSL termination, and domain management
3. **Application Containers**: Individual Docker containers for each installed app
4. **Shared Volume System**: For persistent data storage across containers

The overall architecture follows a hub-and-spoke model where the Runtipi core orchestrates communication between services.

## Key Technical Decisions

1. **Docker-based Deployment**: Using Docker for container management ensures isolation, portability, and consistent environments.

2. **Docker Compose Orchestration**: Docker Compose provides service definition and orchestration for multi-container applications.

3. **Traefik as Reverse Proxy**: Chosen for its Docker integration, automatic SSL handling, and dynamic configuration.

4. **TypeScript/Node.js Backend**: Provides type safety and modern JavaScript features while maintaining performance.

5. **React Frontend**: Offers a component-based architecture for building the user interface.

6. **App Store Repository**: External repository of application definitions, enabling community contributions.

7. **Volume Management**: Structured approach to data persistence with standardized paths and volume mapping.

## Design Patterns

1. **Repository Pattern**: For data access abstraction in the backend services.

2. **Dependency Injection**: Used throughout the NestJS backend for loose coupling and testability.

3. **Container Pattern**: Using Docker containers as the fundamental unit of deployment.

4. **Facade Pattern**: The web UI provides a simplified interface to complex underlying systems.

5. **Plugin Architecture**: App definitions follow a standardized format that allows them to plug into the system.

6. **Event-driven Architecture**: For communication between system components.

7. **Microservices (Light)**: Each app operates independently with its own lifecycle.

## Component Relationships

1. **Core ↔ App Store**: The Runtipi core queries the app store repository for available applications.

2. **Core ↔ Docker**: Runtipi core manages containers via Docker's API.

3. **Core ↔ Traefik**: Runtipi configures Traefik for routing to application containers.

4. **Apps ↔ Shared Volumes**: Applications access persistent data through mounted volumes.

5. **Frontend ↔ Backend**: The React UI communicates with the NestJS backend via RESTful APIs.

6. **Apps ↔ Apps**: Some applications can be configured to communicate with others (e.g., authentication, storage).

## Critical Implementation Paths

1. **Installation Flow**: 
   - Download install script
   - Script pulls Docker images
   - Core container launched
   - Initial configuration via web UI

2. **App Deployment Path**:
   - User selects app from store
   - System pulls app definition
   - Dependencies are checked/installed
   - Docker images are downloaded
   - Container(s) configured and started
   - Traefik configuration updated
   - User directed to new application

3. **Authentication Flow**:
   - User login/registration
   - JWT token generation
   - Token validation for protected routes
   - Optional: Auth propagation to installed apps

4. **Update Mechanism**:
   - Check for system updates
   - Pull new Docker images
   - Migrate data if necessary
   - Restart services

## Security Model

1. **Container Isolation**: Applications run in isolated containers with limited permissions.

2. **Authentication/Authorization**: Role-based access control for the Runtipi dashboard.

3. **HTTPS by Default**: SSL/TLS encryption for all web traffic.

4. **Network Segmentation**: Internal networks for container-to-container communication.

5. **Volume Permissions**: Careful management of filesystem permissions for application data.

## Scalability Considerations

While primarily designed for single-server deployment, Runtipi's architecture incorporates:

1. **Resource Controls**: Docker resource limits for CPU, memory, etc.

2. **Performance Monitoring**: Tracking system load and container health.

3. **Graceful Degradation**: System continues to function if individual apps fail.

4. **Backup Systems**: For preserving user data and configuration.