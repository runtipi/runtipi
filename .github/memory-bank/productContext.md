# Runtipi Product Context

## Why Runtipi Exists

Runtipi was created to democratize self-hosting by making it accessible to users with varying levels of technical expertise. In an era of increasing concerns about privacy, data ownership, and centralized services, Runtipi enables individuals to take control of their digital lives by providing an easy way to deploy and manage self-hosted alternatives to popular cloud services.

## Problems Runtipi Solves

1. **Technical Complexity**: Self-hosting traditionally requires knowledge of Docker, networking, Linux administration, and security. Runtipi abstracts these complexities away behind a user-friendly interface.

2. **Discovery Challenges**: Finding quality self-hosted applications and determining their reliability can be difficult. Runtipi's app store provides a curated collection of tested applications.

3. **Integration Difficulties**: Making multiple services work together typically requires manual configuration. Runtipi handles inter-service connectivity automatically.

4. **Maintenance Burden**: Updating and maintaining multiple services can be time-consuming. Runtipi simplifies the update process for both the platform and individual applications.

5. **Security Concerns**: Properly securing self-hosted services requires expertise. Runtipi implements security best practices by default.

## How Runtipi Works

1. **Installation**: Users install Runtipi on their server through a simple installation script (install.sh).

2. **Web Interface**: After installation, users access the Runtipi dashboard through their browser.

3. **App Store**: From the dashboard, users can browse, install, and configure applications from the app store.

4. **Container Management**: Runtipi uses Docker to deploy applications in isolated containers, managing networking, volumes, and dependencies.

5. **Reverse Proxy**: Traefik handles routing, HTTPS, and domain configuration automatically for all services.

6. **User Management**: Runtipi provides authentication and authorization for both the platform itself and, where applicable, for the deployed applications.

## User Experience Goals

1. **Simplicity**: Users should be able to deploy complex applications with minimal steps and technical knowledge.

2. **Discoverability**: The interface should make it easy to find and understand available applications.

3. **Reliability**: Services deployed through Runtipi should be stable and function as expected without extensive troubleshooting.

4. **Transparency**: Users should understand what's happening with their services, including resource usage and status.

5. **Control**: While abstracting complexity, Runtipi should still provide advanced options for users who want more control.

6. **Accessibility**: The platform should be usable by people with varying levels of technical knowledge and abilities.

7. **Internationalization**: The interface should be available in multiple languages to serve a global user base.

## Value Proposition

Runtipi empowers users to:

1. **Own Their Data**: Keep personal data on hardware they control rather than on third-party servers.

2. **Enhance Privacy**: Reduce exposure to data collection by large tech companies.

3. **Learn About Self-Hosting**: Gradually understand more about server management in a supported environment.

4. **Customize Their Digital Environment**: Adapt services to specific needs rather than conforming to one-size-fits-all solutions.

5. **Build Technical Skills**: Use Runtipi as a stepping stone to develop broader technical expertise.

6. **Support Open Source**: Participate in the open-source ecosystem by using and potentially contributing to open-source applications.