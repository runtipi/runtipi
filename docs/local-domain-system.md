# Runtipi Local Domain System

## Overview

The Local Domain System is a core component of Runtipi that enables applications
to be accessed through user-friendly subdomains on the local network without
requiring public domain registration or DNS configuration. This system
automatically generates predictable local domain names for installed
applications and configures the necessary routing and TLS certificates to make
these domains accessible within the local network.

## Technical Architecture

The local domain system consists of several interconnected components:

1. **Configuration Management** - Global local domain settings stored in
   environment variables
2. **TLS Certificate Generation** - Self-signed wildcard certificates for secure
   local connections
3. **Local Domain Assignment** - Logic for generating and assigning local
   domains to applications
4. **Traefik Integration** - Local routing configuration via labels for Docker
   containers
5. **Environment Variable Injection** - Making local domain information
   available to applications

## Local Domain Configuration

### Default Configuration

The system uses a default local domain of `tipi.lan` which is configurable
through system settings. This base domain is stored in the `LOCAL_DOMAIN`
environment variable and is used as the foundation for all local app domains.

```typescript
// Default configuration in env-helpers.ts
envMap.set(
    "LOCAL_DOMAIN",
    data.localDomain || envMap.get("LOCAL_DOMAIN") || "tipi.lan",
);
```

### Local Domain Structure

Local domains follow two possible patterns:

1. **Auto-generated pattern** (default): `{appName}-{appStoreId}.{localDomain}`
2. **Custom subdomain pattern** (when specified): `{customSubdomain}.{localDomain}`

For example, with auto-generated pattern:
- `appName` = "nextcloud"
- `appStoreId` = "official"
- `localDomain` = "tipi.lan"
The resulting local domain would be: `nextcloud-official.tipi.lan`

With custom subdomain pattern:
- `customSubdomain` = "cloud"
- `localDomain` = "tipi.lan"
The resulting local domain would be: `cloud.tipi.lan`

This flexibility allows users to choose between the system-generated predictable format or a custom, more user-friendly subdomain.

## Custom Subdomains

### Configuring Custom Subdomains

Users can specify a custom subdomain during app installation or when updating app settings. The system:

1. Validates that the subdomain follows proper hostname format (alphanumeric characters and hyphens)
2. Checks for subdomain conflicts with other applications
3. Stores the custom subdomain in the database
4. Uses this custom subdomain in all routing configurations

### Subdomain Validation and Conflict Prevention

The system prevents duplicate subdomains to avoid routing conflicts:

```typescript
// Check for duplicate local subdomains
if (exposedLocal && parsedForm.localSubdomain) {
  const appsWithSameLocalSubdomain = await this.appRepository.getAppsByLocalSubdomain(parsedForm.localSubdomain);

  if (appsWithSameLocalSubdomain.length > 0) {
    const conflictApp = appsWithSameLocalSubdomain[0];
    throw new TranslatableError('APP_ERROR_LOCAL_SUBDOMAIN_ALREADY_IN_USE', { 
      subdomain: parsedForm.localSubdomain, 
      id: conflictApp.appName 
    });
  }
}
```

### Storage and Persistence

Custom subdomains are stored in the app database table using the `localSubdomain` field. When a custom subdomain is specified, it takes precedence over the auto-generated format.

## TLS Certificate Generation

### Certificate Generation Process

Runtipi generates self-signed wildcard certificates for the local domain (e.g.,
`*.tipi.lan`) during the bootstrap process. This eliminates browser security
warnings when accessing applications via HTTPS over the local network.

The key steps in this process are:

1. Check if a certificate for the current local domain already exists
2. If not, generate a new wildcard certificate using OpenSSL
3. Store the certificate in the traefik TLS directory

```typescript
// Certificate generation in app.service.ts
const subject =
    `/O=runtipi.io/OU=IT/CN=*.${data.localDomain}/emailAddress=webmaster@${data.localDomain}`;
const subjectAltName = `DNS:*.${data.localDomain},DNS:${data.localDomain}`;

// Generate certificate with OpenSSL
await execAsync(
    `openssl req -x509 -newkey rsa:4096 -keyout ${dataDir}/traefik/tls/key.pem -out ${dataDir}/traefik/tls/cert.pem -days 365 -subj "${subject}" -addext "subjectAltName = ${subjectAltName}" -nodes`,
);
```

### Certificate Renewal

The system checks certificate expiration and will regenerate certificates that
are expired or about to expire (within 24 hours):

```typescript
// Certificate expiration check
const { stdout } = await execAsync(
    `openssl x509 -checkend 86400 -noout -in ${tlsFolder}/cert.pem`,
);
if (stdout.includes("Certificate will not expire")) {
    this.logger.info(`TLS certificate for ${data.localDomain} already exists`);
    return;
}
```

## Local Domain Assignment During App Installation

### Local Domain Exposure Configuration

When installing an app with local domain exposure enabled, the system:

1. Checks if the app is exposable (not all apps can be exposed)
2. Sets the appropriate environment variables for local domain access
3. Configures Traefik routing for the local domain

```typescript
// Local domain validation during installation
if (!appInfo.exposable) {
    if (exposedLocal) {
        this.logger.warn(
            `App ${appUrn} is not exposable, resetting proxy settings`,
        );
    }
    parsedForm.exposedLocal = false;
    // Reset other exposure settings
}
```

### Environment Variable Configuration for Local Domains

The `AppHelpers` class generates environment variables for the app when local
exposure is enabled:

```typescript
// Local domain environment variables assignment
if (form.exposedLocal && !form.openPort) {
    const subdomain = form.localSubdomain ? form.localSubdomain : `${appName}-${appStoreId}`;
    
    envMap.set(
        "APP_DOMAIN",
        `${subdomain}.${envMap.get("LOCAL_DOMAIN")}`,
    );
    envMap.set(
        "APP_HOST",
        `${subdomain}.${envMap.get("LOCAL_DOMAIN")}`,
    );
    envMap.set("APP_PROTOCOL", "https");
}
```

This configuration ensures that:

1. The app knows its full local domain address through `APP_DOMAIN`
2. The host part is available separately through `APP_HOST`
3. The protocol is set to HTTPS since local domains use the self-signed
   certificate
4. Custom subdomains are used when specified, falling back to the auto-generated format

## Traefik Integration for Local Domains

### Local Domain Traefik Label Generation

The `TraefikLabelsBuilder` class generates Docker labels specifically for local
domain routing:

```typescript
// Base label configuration
this.labels = {
    generated: true,
    "traefik.enable": false,
    "traefik.docker.network": "runtipi_tipi_main_network",
    [`traefik.http.middlewares.${params.appId}-${params.storeId}-web-redirect.redirectscheme.scheme`]:
        "https",
    [`traefik.http.services.${params.appId}-${params.storeId}.loadbalancer.server.port`]:
        `${params.internalPort}`,
};
```

### Local Domain Routing Configuration

The class method `addExposedLocalLabels()` adds the specific configuration for
local domain routing:

```typescript
// Local domain routing configuration
if (this.params.exposedLocal) {
    const subdomain = this.params.localSubdomain 
        ? this.params.localSubdomain 
        : `${this.params.appId}-${this.params.storeId}`;

    Object.assign(this.labels, {
        "traefik.enable": true,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.rule`]:
            `Host(\`${subdomain}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.entrypoints`]:
            "web",
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.service`]:
            `${this.params.appId}-${this.params.storeId}`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.middlewares`]:
            `${this.params.appId}-${this.params.storeId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.rule`]:
            `Host(\`${subdomain}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.entrypoints`]:
            "websecure",
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.service`]:
            `${this.params.appId}-${this.params.storeId}`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.tls`]:
            true,
    });
}
```

This configuration:

1. Creates an HTTP route that redirects to HTTPS
2. Creates an HTTPS route with TLS enabled
3. Uses either the custom subdomain or the default local domain pattern for routing rules
4. Ensures all traffic is properly directed to the application container

## DNS Resolution for Local Domains

For local domains to work, clients must be able to resolve the domain names to
the Runtipi server's IP address. This can be accomplished through:

1. **Local DNS Server** - Configure a local DNS server (like Pi-hole, dnsmasq)
   to resolve the local domain
2. **Host File Entries** - Add entries to the host file on client machines
3. **mDNS/Bonjour** - Some networks may support automatic discovery through mDNS

Runtipi itself does not currently implement DNS server functionality, so one of
the above methods must be used for proper name resolution.

### Example Host File Configuration

To set up local domain resolution via host files, add entries for each app or a
wildcard entry:

```
# Example /etc/hosts entry for specific app
192.168.1.100 nextcloud-official.tipi.lan

# Example for custom subdomain
192.168.1.100 cloud.tipi.lan

# Example for DNS server wildcard configuration
192.168.1.100 *.tipi.lan
```

## Authentication Integration with Local Domains

When authentication is enabled for an app with local domain exposure, the system
adds a middleware that redirects unauthenticated requests to the Runtipi login
page:

```typescript
// Authentication middleware configuration for local domains
if (this.params.enableAuth) {
    Object.assign(this.labels, {
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.middlewares`]:
            "runtipi",
    });
}
```

The authentication process for local domains:

1. Intercepts requests to protected applications
2. Checks for valid session cookies
3. Redirects to login if no valid session exists
4. Returns the user to the application after successful authentication

## Best Practices for Local Domain Development

When working with the local domain system:

1. **Test local domain exposure** - Ensure your app works properly with local
   domains
2. **Use environment variables** - Access domain information through the
   provided environment variables
3. **Consider local networking** - Be aware of network isolation and routing
   implications
4. **Handle relative URLs correctly** - Apps should use relative URLs or read
   the APP_DOMAIN variable
5. **Choose meaningful subdomains** - When using custom subdomains, select names that are memorable and relevant to the application's purpose

## Troubleshooting Local Domains

Common issues with the local domain system:

1. **Certificate Errors** - Check if certificates are properly generated in the
   `traefik/tls` directory
2. **Name Resolution Failures** - Ensure the client can resolve the local domain
   to the Runtipi server
3. **Local Routing Issues** - Verify Traefik labels are correctly generated and
   applied
4. **Browser Cache Problems** - Clear browser caches when testing certificate
   changes
5. **Subdomain Conflicts** - Verify there are no duplicate subdomains in use across applications

To troubleshoot name resolution:

```bash
# Test domain resolution (auto-generated pattern)
ping nextcloud-official.tipi.lan

# Test domain resolution (custom subdomain)
ping cloud.tipi.lan

# Check certificate validity
openssl s_client -connect nextcloud-official.tipi.lan:443 -servername nextcloud-official.tipi.lan
```

## Future Enhancements for Local Domains

Potential improvements to the local domain system:

1. **Built-in DNS Server** - Adding a lightweight DNS server for automatic local
   domain resolution
2. **Dynamic Local Domain Patterns** - Supporting more dynamic local domain
   generation patterns
3. **Local Domain Discovery** - Implementing mDNS advertisement for better local
   network discovery
4. **Local Domain Management UI** - Adding a user interface for managing local
   domains
5. **Domain Templates** - Providing suggested subdomain patterns based on application type

## Conclusion

The Local Domain System provides a powerful way for Runtipi to make applications
accessible through user-friendly URLs within the local network, without
requiring public domain registration or external DNS configuration. With the addition of custom subdomains, users now have greater flexibility in creating intuitive, memorable URLs for their applications. By understanding this system, contributors can develop applications that integrate
seamlessly with Runtipi's local networking infrastructure.
