import type { TraefikOverride } from './schemas';

interface TraefikLabelsArgs {
  traefikPort: number | string;
  appId: string;
  exposedLocal?: boolean;
  exposed?: boolean;
  enableAuth?: boolean;
  overrides: TraefikOverride;
}

export class TraefikLabelsBuilder {
  private labels: Record<string, string | boolean> = {};

  constructor(private params: TraefikLabelsArgs) {
    this.labels = {
      generated: true,
      'traefik.enable': false,
      [`traefik.http.middlewares.${params.appId}-web-redirect.redirectscheme.scheme`]: 'https',
      [`traefik.http.services.${params.appId}.loadbalancer.server.port`]: `${params.traefikPort}`,
    };
  }

  addExposedLabels() {
    if (this.params.exposed) {
      Object.assign(this.labels, {
        'traefik.enable': true,
        [`traefik.http.routers.${this.params.appId}-insecure.rule`]: this.params.overrides.traefikWeb?.rule ?? 'Host(`${APP_DOMAIN}`)',
        [`traefik.http.routers.${this.params.appId}-insecure.entrypoints`]: this.params.overrides.traefikWeb?.entryPoints ?? 'web',
        [`traefik.http.routers.${this.params.appId}-insecure.service`]: this.params.overrides.traefikWeb?.service ?? this.params.appId,
        [`traefik.http.routers.${this.params.appId}-insecure.middlewares`]:
          this.params.overrides.traefikWeb?.middlewares ?? `${this.params.appId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}.rule`]: this.params.overrides.traefikWebSecure?.rule ?? 'Host(`${APP_DOMAIN}`)',
        [`traefik.http.routers.${this.params.appId}.entrypoints`]: this.params.overrides.traefikWebSecure?.entryPoints ?? 'websecure',
        [`traefik.http.routers.${this.params.appId}.service`]: this.params.overrides.traefikWebSecure?.service ?? this.params.appId,
        [`traefik.http.routers.${this.params.appId}.tls.certresolver`]: this.params.overrides.traefikWebSecure?.certResolver ?? 'myresolver',
      });

      if (this.params.enableAuth) {
        Object.assign(this.labels, {
          [`traefik.http.routers.${this.params.appId}.middlewares`]: 'runtipi',
        });
      }
    }
    return this;
  }

  addExposedLocalLabels() {
    if (this.params.exposedLocal) {
      Object.assign(this.labels, {
        'traefik.enable': true,
        [`traefik.http.routers.${this.params.appId}-local-insecure.rule`]:
          this.params.overrides.traefikLocal?.rule ?? `Host(\`${this.params.appId}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-local-insecure.entrypoints`]: this.params.overrides.traefikLocal?.entryPoints ?? 'web',
        [`traefik.http.routers.${this.params.appId}-local-insecure.service`]: this.params.overrides.traefikLocal?.service ?? this.params.appId,
        [`traefik.http.routers.${this.params.appId}-local-insecure.middlewares`]:
          this.params.overrides.traefikLocal?.middlewares ?? `${this.params.appId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}-local.rule`]:
          this.params.overrides.traefikLocalSecure?.rule ?? `Host(\`${this.params.appId}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-local.entrypoints`]: this.params.overrides.traefikLocalSecure?.entryPoints ?? 'websecure',
        [`traefik.http.routers.${this.params.appId}-local.service`]: this.params.overrides.traefikLocalSecure?.service ?? this.params.appId,
        [`traefik.http.routers.${this.params.appId}-local.tls`]: this.params.overrides.traefikLocalSecure?.tls ?? true,
      });

      if (this.params.enableAuth) {
        Object.assign(this.labels, {
          [`traefik.http.routers.${this.params.appId}-local.middlewares`]: 'runtipi',
        });
      }
    }
    return this;
  }

  build() {
    return this.labels;
  }
}
