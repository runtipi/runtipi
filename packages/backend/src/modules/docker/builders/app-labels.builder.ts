interface AppLabelsArgs {
  appId: string;
  storeId: string;
  appName: string;
  appDescription: string;
  categories: string[];
  internalPort?: number | string;
  hostPort?: number | string;
  localSubdomain?: string;
  exposedLocal?: boolean;
  exposed?: boolean;
  domain?: string;
  openPort?: boolean;
  runtipiHost?: string;
  localDomain: string;
}

export class AppLabelsBuilder {
  constructor(private params: AppLabelsArgs) {}

  build(): Record<string, string> {
    // Determine href based on app exposure configuration (priority order)
    let href: string | undefined;
    if (this.params.exposed && this.params.domain) {
      // Internet-exposed with custom domain
      href = `https://${this.params.domain}`;
    } else if (this.params.exposedLocal) {
      // LAN-exposed via Traefik
      const subdomain = this.params.localSubdomain ? this.params.localSubdomain : `${this.params.appId}-${this.params.storeId}`;
      href = `https://${subdomain}.${this.params.localDomain}`;
    } else if (this.params.runtipiHost && this.params.openPort && this.params.hostPort) {
      // Host port accessible (requires RUNTIPI_HOST to be configured)
      href = `http://${this.params.runtipiHost}:${this.params.hostPort}`;
    }
    // If no href condition matches, omit the href label (no browser-accessible URL)

    // Use Runtipi's app logo API as the icon URL
    const iconUrl = `http://runtipi:3000/api/marketplace/apps/${this.params.appId}:${this.params.storeId}/image`;

    const labels: Record<string, string> = {
      'runtipi.name': this.params.appName,
      'runtipi.icon': iconUrl,
      'runtipi.short_desc': this.params.appDescription,
    };

    // Only add categories if not empty
    if (this.params.categories.length > 0) {
      labels['runtipi.categories'] = this.params.categories.join(',');
    }

    // Only add href if we have a browser-accessible URL
    if (href) {
      labels['runtipi.href'] = href;
    }

    return labels;
  }
}
