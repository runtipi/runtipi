# Runtipi Active Context

## Current Work Focus

As of May 2, 2025, the Runtipi project is in active development with a focus on enhancing the application ecosystem, improving user experience, and strengthening the platform's stability. The system has an established architecture with ongoing development of new features and app integrations.

## Recent Changes

Based on the repository structure and content, the project has:

1. A mature application structure with a monorepo architecture (packages for backend, frontend, common)
2. Extensive end-to-end testing setup with Playwright
3. Numerous apps available in the app repository (268 apps as seen in the migrated repository)
4. Multiple language translations supported through Crowdin integration
5. Docker-based deployment system with Traefik for networking

## Next Steps

The likely next steps for the project include:

1. Continued expansion of the app store with new applications
2. Refinement of the user experience, particularly for non-technical users
3. Performance optimizations for systems with limited resources
4. Enhanced security features and best practices
5. Improved documentation and community support resources

## Active Decisions and Considerations

Key decisions that shape current development:

1. **App Store Management**: The approach to curating, testing, and integrating new applications
2. **User Experience Focus**: Balancing simplicity for new users with flexibility for advanced users
3. **Community Contribution Flow**: How to efficiently integrate community contributions
4. **Versioning and Updates**: Managing system updates without disrupting user applications
5. **Security Measures**: Ensuring that applications are isolated and secure by default

## Important Patterns and Preferences

1. **Code Style**: TypeScript-based with strong typing and modern JavaScript features
2. **Docker-First**: All applications are deployed as Docker containers
3. **Testing Priority**: End-to-end tests ensure that key user flows work correctly
4. **Localization**: All user-facing text should be localized and managed via translation system
5. **Contribution Process**: Clear guidelines for community contributions

## Learnings and Project Insights

1. **User Needs**: Home server users have diverse needs, from media management to productivity tools
2. **Technical Barriers**: Docker abstractions have been successful in lowering barriers to entry
3. **Community Support**: Active community helps with translations, app submissions, and documentation
4. **Common Pain Points**: Areas that still require attention include initial setup, networking complexities, and troubleshooting application-specific issues
5. **Scaling Considerations**: As applications grow in number and complexity, resource management becomes increasingly important