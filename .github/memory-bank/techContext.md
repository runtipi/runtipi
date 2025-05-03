# Runtipi Technical Context

## Technologies Used

### Core Technologies

1. **TypeScript/JavaScript**
   - Primary programming language for both frontend and backend
   - Provides type safety and modern language features

2. **Docker & Docker Compose**
   - Used for containerization and service orchestration
   - Isolates applications in separate containers
   - Manages networking between applications
   - Handles resource allocation and limits

3. **Traefik**
   - Reverse proxy and load balancer
   - Handles routing to the correct containers
   - Manages SSL/TLS certificates
   - Provides HTTP/HTTPS endpoints for applications

4. **NestJS**
   - Backend framework
   - Provides structure for API development
   - Implements dependency injection
   - Handles request validation and routing

5. **React**
   - Frontend library for building the user interface
   - Component-based architecture
   - State management for UI components

### Supporting Technologies

1. **SQLite**
   - Lightweight database for local application data storage
   - Used for user management, settings, and app metadata

2. **PNPM**
   - Package manager for JavaScript dependencies
   - Provides workspace capabilities for monorepo structure

3. **Git**
   - Version control system for source code
   - Used for contribution workflow and releases

4. **Playwright**
   - End-to-end testing framework
   - Ensures UI functionality works as expected

5. **Localization Framework**
   - Supports multiple languages through translation files
   - Managed via Crowdin for community contributions

## Development Setup

### Repository Structure

- `apps/` - Contains application code for different services
- `packages/` - Shared libraries and components
- `scripts/` - Utility scripts for installation and maintenance
- `media/` - Directory structure for user media
- `e2e/` - End-to-end tests
- `repos/` - Repositories for app definitions
- `traefik/` - Traefik configuration

### Build System

- Turborepo for monorepo management
- TypeScript compilation for type checking and transpilation
- Vite for frontend build and development server
- API schema generation tools

### Development Workflow

1. Local development using Docker Compose
2. Live reload for both frontend and backend changes
3. End-to-end testing with Playwright
4. CI/CD pipeline for automated testing and builds

## Technical Constraints

1. **Server Requirements**
   - Requires Docker and Docker Compose
   - Minimum CPU/RAM requirements depend on installed applications
   - Persistent storage for application data

2. **Networking**
   - Requires specific ports to be available (typically 80/443)
   - Designed to work behind NAT with port forwarding
   - Can operate with or without a domain name

3. **Security Limitations**
   - Application security depends on individual container security
   - User responsible for server-level security measures
   - Updates must be applied regularly

4. **Scaling Constraints**
   - Primarily designed for single-server deployment
   - Resource limits based on host hardware

## Dependencies

### External Dependencies

1. **Docker Engine & Docker Compose**
   - Required for container management
   - Must be installed on the host system

2. **App Images**
   - Docker images for applications come from various sources
   - Quality and security vary by application

3. **NPM Packages**
   - Various JavaScript libraries used in development
   - Managed via PNPM and package.json

4. **Third-Party Services**
   - Optional integrations with external services
   - May include authentication providers, monitoring tools, etc.

### Internal Dependencies

1. **API Services**
   - Backend services for application management
   - User authentication and authorization
   - App store and application discovery

2. **UI Components**
   - Shared React components
   - Styling system and theme

3. **Utility Libraries**
   - Common code shared between frontend and backend
   - Type definitions and interfaces

## Tool Usage Patterns

1. **Docker CLI/API**
   - Used for managing containers
   - Pulling images, starting/stopping containers, etc.

2. **Traefik Labels**
   - Container labels used to configure routing
   - Dynamic configuration based on application needs

3. **Environment Variables**
   - Used for configuration of both Runtipi and applications
   - Centralized in .env files and propagated to containers

4. **Volume Mounts**
   - Standardized paths for persistent data
   - Shared data across applications where appropriate

5. **Development Tools**
   - VSCode as the recommended editor
   - ESLint/Prettier for code formatting
   - TypeScript for type checking