interface TraefikLabelsArgs {
  internalPort: number | string;
  appId: string;
  exposedLocal?: boolean;
  exposed?: boolean;
  storeId: string;
  enableAuth?: boolean;
  localSubdomain?: string;
}

export class TraefikLabelsBuilder {
  private labels: Record<string, string | boolean> = {};

  constructor(private params: TraefikLabelsArgs) {
    this.labels = {
      generated: true,
      'traefik.enable': false,
      'traefik.docker.network': 'runtipi_tipi_main_network',
      [`traefik.http.middlewares.${params.appId}-${params.storeId}-web-redirect.redirectscheme.scheme`]: 'https',
      [`traefik.http.services.${params.appId}-${params.storeId}.loadbalancer.server.port`]: `${params.internalPort}`,
    };
  }

  addExposedLabels() {
    if (this.params.exposed) {
      Object.assign(this.labels, {
        'traefik.enable': true,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-insecure.rule`]: 'Host(`${APP_DOMAIN}`)',
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-insecure.entrypoints`]: 'web',
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-insecure.service`]: `${this.params.appId}-${this.params.storeId}`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-insecure.middlewares`]: `${this.params.appId}-${this.params.storeId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}.rule`]: 'Host(`${APP_DOMAIN}`)',
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}.entrypoints`]: 'websecure',
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}.service`]: `${this.params.appId}-${this.params.storeId}`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}.tls.certresolver`]: 'myresolver',
      });

      if (this.params.enableAuth) {
        Object.assign(this.labels, {
          [`traefik.http.routers.${this.params.appId}-${this.params.storeId}.middlewares`]: 'runtipi',
        });
      }
    }
    return this;
  }

  addExposedLocalLabels() {
    if (this.params.exposedLocal) {
      const subdomain = this.params.localSubdomain ? this.params.localSubdomain : `${this.params.appId}-${this.params.storeId}`;

      Object.assign(this.labels, {
        'traefik.enable': true,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.rule`]: `Host(\`${subdomain}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.entrypoints`]: 'web',
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.service`]: `${this.params.appId}-${this.params.storeId}`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local-insecure.middlewares`]: `${this.params.appId}-${this.params.storeId}-web-redirect`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.rule`]: `Host(\`${subdomain}.\${LOCAL_DOMAIN}\`)`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.entrypoints`]: 'websecure',
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.service`]: `${this.params.appId}-${this.params.storeId}`,
        [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.tls`]: true,
      });

      if (this.params.enableAuth) {
        Object.assign(this.labels, {
          [`traefik.http.routers.${this.params.appId}-${this.params.storeId}-local.middlewares`]: 'runtipi',
        });
      }
    }
    return this;
  }

  build() {
    return this.labels;
  }
}
