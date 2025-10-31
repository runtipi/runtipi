import { HomepageLabelsBuilder } from '../homepage-labels.builder';

describe('HomepageLabelsBuilder', () => {
  it('should generate correct labels for internet-exposed app with custom domain', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      exposed: true,
      domain: 'grafana.example.com',
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'homepage.group': 'Data',
      'homepage.name': 'Grafana',
      'homepage.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'homepage.href': 'https://grafana.example.com',
      'homepage.description': 'Data visualization platform',
    });
  });

  it('should generate correct labels for exposed local app', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'homepage.group': 'Data',
      'homepage.name': 'Grafana',
      'homepage.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'homepage.href': 'https://grafana-store-id.${LOCAL_DOMAIN}',
      'homepage.description': 'Data visualization platform',
    });
  });

  it('should use custom subdomain when provided', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      localSubdomain: 'custom-grafana',
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['homepage.href']).toBe('https://custom-grafana.${LOCAL_DOMAIN}');
  });

  it('should generate href for openPort app when RUNTIPI_HOST is set', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      openPort: true,
      runtipiHost: 'halos.local',
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'homepage.group': 'Data',
      'homepage.name': 'Grafana',
      'homepage.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'homepage.href': 'http://halos.local:3000',
      'homepage.description': 'Data visualization platform',
    });
  });

  it('should omit href for non-exposed apps without RUNTIPI_HOST', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      openPort: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'homepage.group': 'Data',
      'homepage.name': 'Grafana',
      'homepage.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'homepage.description': 'Data visualization platform',
    });
    expect(labels['homepage.href']).toBeUndefined();
  });

  it('should omit href for apps with no exposure configuration', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'homepage.group': 'Data',
      'homepage.name': 'Grafana',
      'homepage.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'homepage.description': 'Data visualization platform',
    });
    expect(labels['homepage.href']).toBeUndefined();
  });

  it('should prioritize internet exposure over local exposure', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      category: 'data',
      internalPort: 3000,
      exposed: true,
      domain: 'grafana.example.com',
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['homepage.href']).toBe('https://grafana.example.com');
  });

  it('should map categories correctly', () => {
    const testCases = [
      { category: 'media', expected: 'Media' },
      { category: 'network', expected: 'Network' },
      { category: 'data', expected: 'Data' },
      { category: 'development', expected: 'Development' },
      { category: 'automation', expected: 'Automation' },
      { category: 'utilities', expected: 'Utilities' },
      { category: 'photography', expected: 'Photography' },
      { category: 'security', expected: 'Security' },
      { category: 'books', expected: 'Books' },
      { category: 'music', expected: 'Music' },
      { category: 'finance', expected: 'Finance' },
      { category: 'gaming', expected: 'Gaming' },
      { category: 'ai', expected: 'AI' },
      { category: 'unknown', expected: 'Applications' },
    ];

    testCases.forEach(({ category, expected }) => {
      const builder = new HomepageLabelsBuilder({
        appId: 'test',
        storeId: 'store',
        appName: 'Test',
        appDescription: 'Test app',
        category,
        exposedLocal: true,
        localDomain: '${LOCAL_DOMAIN}',
      });

      expect(builder.build()['homepage.group']).toBe(expected);
    });
  });

  it('should handle special characters in app names', () => {
    const builder = new HomepageLabelsBuilder({
      appId: 'signal-k',
      storeId: 'marine-store',
      appName: 'Signal K Server',
      appDescription: 'Marine data platform & more',
      category: 'network',
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['homepage.name']).toBe('Signal K Server');
    expect(labels['homepage.description']).toBe('Marine data platform & more');
  });
});
