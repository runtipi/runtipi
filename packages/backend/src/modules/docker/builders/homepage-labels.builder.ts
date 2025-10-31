interface HomepageLabelsArgs {
  appId: string;
  storeId: string;
  appName: string;
  appDescription: string;
  category: string;
  internalPort?: number | string;
  localSubdomain?: string;
  exposedLocal?: boolean;
  exposed?: boolean;
  domain?: string;
  openPort?: boolean;
  runtipiHost?: string;
  localDomain: string;
}

export class HomepageLabelsBuilder {
  private labels: Record<string, string> = {};

  constructor(private params: HomepageLabelsArgs) {}

  build(): Record<string, string> {
    const group = this.mapCategoryToGroup(this.params.category);

    // Determine href based on app exposure configuration (priority order)
    let href: string | undefined;
    if (this.params.exposed && this.params.domain) {
      // Internet-exposed with custom domain
      href = `https://${this.params.domain}`;
    } else if (this.params.exposedLocal) {
      // LAN-exposed via Traefik
      const subdomain = this.params.localSubdomain ? this.params.localSubdomain : `${this.params.appId}-${this.params.storeId}`;
      href = `https://${subdomain}.${this.params.localDomain}`;
    } else if (this.params.runtipiHost && this.params.openPort && this.params.internalPort) {
      // Host port accessible (requires RUNTIPI_HOST to be configured)
      href = `http://${this.params.runtipiHost}:${this.params.internalPort}`;
    }
    // If no href condition matches, omit the href label (no browser-accessible URL)

    // Use Runtipi's app logo API as the icon URL
    const iconUrl = `http://runtipi:3000/api/marketplace/apps/${this.params.appId}:${this.params.storeId}/image`;

    const labels: Record<string, string> = {
      'homepage.group': group,
      'homepage.name': this.params.appName,
      'homepage.icon': iconUrl,
      'homepage.description': this.params.appDescription,
    };

    // Only add href if we have a browser-accessible URL
    if (href) {
      labels['homepage.href'] = href;
    }

    return labels;
  }

  private mapCategoryToGroup(category: string): string {
    const mapping: Record<string, string> = {
      network: 'Network',
      media: 'Media',
      development: 'Development',
      automation: 'Automation',
      social: 'Social',
      utilities: 'Utilities',
      photography: 'Photography',
      security: 'Security',
      featured: 'Featured',
      books: 'Books',
      data: 'Data',
      music: 'Music',
      finance: 'Finance',
      gaming: 'Gaming',
      ai: 'AI',
    };

    return mapping[category] || 'Applications';
  }
}
