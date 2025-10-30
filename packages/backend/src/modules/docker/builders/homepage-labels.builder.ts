interface HomepageLabelsArgs {
  appId: string;
  storeId: string;
  appName: string;
  appDescription: string;
  category: string;
  internalPort?: number | string;
  localSubdomain?: string;
  exposedLocal?: boolean;
  localDomain: string;
}

export class HomepageLabelsBuilder {
  private labels: Record<string, string> = {};

  constructor(private params: HomepageLabelsArgs) {}

  build(): Record<string, string> {
    const group = this.mapCategoryToGroup(this.params.category);

    // Determine href based on whether app is exposed locally
    let href: string;
    if (this.params.exposedLocal) {
      // Use Traefik URL for exposed apps
      const subdomain = this.params.localSubdomain ? this.params.localSubdomain : `${this.params.appId}-${this.params.storeId}`;
      href = `https://${subdomain}.${this.params.localDomain}`;
    } else {
      // Use direct Docker network access for non-exposed apps
      const port = this.params.internalPort || 80;
      href = `http://${this.params.appId}-${this.params.storeId}:${port}`;
    }

    // Use Runtipi's app logo API as the icon URL
    const iconUrl = `http://runtipi:3000/api/marketplace/apps/${this.params.appId}:${this.params.storeId}/image`;

    return {
      'homepage.group': group,
      'homepage.name': this.params.appName,
      'homepage.icon': iconUrl,
      'homepage.href': href,
      'homepage.description': this.params.appDescription,
    };
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
