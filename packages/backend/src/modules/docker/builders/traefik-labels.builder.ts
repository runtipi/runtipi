interface TraefikLabelsArgs {
  internalPort: number | string;
  appId: string;
  exposedLocal?: boolean;
  exposed?: boolean;
  enableAuth?: boolean;
}

export class TraefikLabelsBuilder {
  private labels: Record<string, string | boolean> = {};

  constructor(private params: TraefikLabelsArgs) {
    this.labels = {
      generated: true,
      'traefik.enable': false,
      [`traefik.http.middlewares.${params.appId}-web-redirect.redirectscheme.scheme`]: 'https',
      [`traefik.http.services.${params.appId}.loadbalancer.server.port`]: `${params.internalPort}`,
    };
  }

  addExposedLabels() {
    if (this.params.exposed) {
      Object.assign(this.labels, {
        'traefik.enable': true,
        [`traefik.http.routers.${this.params.appId}-insecure.rule`]: 'Host(`${APP_DOMAIN}`)',
        [`traefik.http.routers.${this.params.appId}-insecure.entrypoints`]: 'web',
        [`traefik.http.routers.${this.params.appId}-insecure.service`]: this.params.appId,
        [`traefik.http.routers.${this.params.appId}-insecure.middlewares`]: `${this.params.appId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}.rule`]: 'Host(`${APP_DOMAIN}`)',
        [`traefik.http.routers.${this.params.appId}.entrypoints`]: 'websecure',
        [`traefik.http.routers.${this.params.appId}.service`]: this.params.appId,
        [`traefik.http.routers.${this.params.appId}.tls.certresolver`]: 'myresolver',
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
        [`traefik.http.routers.${this.params.appId}-local-insecure.rule`]: `Host(\`${this.params.appId}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-local-insecure.entrypoints`]: 'web',
        [`traefik.http.routers.${this.params.appId}-local-insecure.service`]: this.params.appId,
        [`traefik.http.routers.${this.params.appId}-local-insecure.middlewares`]: `${this.params.appId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}-local.rule`]: `Host(\`${this.params.appId}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-local.entrypoints`]: 'websecure',
        [`traefik.http.routers.${this.params.appId}-local.service`]: this.params.appId,
        [`traefik.http.routers.${this.params.appId}-local.tls`]: true,
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
