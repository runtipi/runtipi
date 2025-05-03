# Runtipi Project Brief

## Project Overview

Runtipi is a personal homeserver orchestrator designed to simplify the deployment, management, and operation of multiple services on a single server. It provides an accessible and user-friendly solution for self-hosting applications without requiring deep technical knowledge of Docker, networking, or server administration.

## Core Problem Statement

Managing multiple self-hosted services is typically complex, requiring specialized knowledge of containers, networking, and Linux administration. Runtipi aims to make self-hosting accessible to users of all technical backgrounds by providing:

1. A streamlined installation process
2. A user-friendly web interface for managing services
3. An "app store" model for discovering and installing new applications
4. Automatic handling of networking, security, and dependency management

## Target Users

- Home lab enthusiasts who want to self-host applications
- Privacy-focused individuals looking to own their data and services
- Technical users who want a simplified management interface for multiple Docker applications
- Non-technical users who want to try self-hosting without extensive technical knowledge

## Key Features

1. **App Store**: Curated collection of self-hostable applications that can be installed with a few clicks
2. **Web UI**: Modern, responsive web interface for managing services
3. **Docker-based**: Leverages Docker for containerization and isolation of services
4. **Automatic Configuration**: Handles networking, reverse proxy (Traefik), and security automatically
5. **Multi-user Support**: Allows for user management and permissions
6. **Multi-language Support**: Translations available for multiple languages

## Success Criteria

1. Users can install Runtipi with minimal technical knowledge
2. Users can discover, install, and manage services through the web interface
3. Services deployed through Runtipi are secure and isolated
4. The system is stable and handles service dependencies appropriately
5. Updates and maintenance can be performed with minimal downtime

## Project Constraints

1. Must be compatible with common server hardware and operating systems
2. Should be accessible to users with limited technical knowledge
3. Must maintain security and privacy standards for all deployed services
4. Should handle resource constraints gracefully on different hardware

## Technical Requirements

1. Backend stack: TypeScript, NestJS
2. Frontend stack: React
3. Containerization: Docker and Docker Compose
4. Reverse proxy: Traefik
5. Development follows modern TypeScript practices and testing methodologies

## Current Status

Runtipi is an active open-source project with a community of contributors. It has an established architecture with ongoing development of new features, improvements, and app integrations.