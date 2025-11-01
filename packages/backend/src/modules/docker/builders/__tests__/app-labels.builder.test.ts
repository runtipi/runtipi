import { AppLabelsBuilder } from '../app-labels.builder';

describe('AppLabelsBuilder', () => {
  it('should generate correct labels for internet-exposed app with custom domain', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      exposed: true,
      domain: 'grafana.example.com',
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'runtipi.categories': 'data',
      'runtipi.name': 'Grafana',
      'runtipi.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'runtipi.href': 'https://grafana.example.com',
      'runtipi.short_desc': 'Data visualization platform',
    });
  });

  it('should generate correct labels for exposed local app', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'runtipi.categories': 'data',
      'runtipi.name': 'Grafana',
      'runtipi.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'runtipi.href': 'https://grafana-store-id.${LOCAL_DOMAIN}',
      'runtipi.short_desc': 'Data visualization platform',
    });
  });

  it('should use custom subdomain when provided', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      localSubdomain: 'custom-grafana',
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['runtipi.href']).toBe('https://custom-grafana.${LOCAL_DOMAIN}');
  });

  it('should generate href for openPort app when RUNTIPI_HOST is set', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      openPort: true,
      runtipiHost: 'halos.local',
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'runtipi.categories': 'data',
      'runtipi.name': 'Grafana',
      'runtipi.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'runtipi.href': 'http://halos.local:3000',
      'runtipi.short_desc': 'Data visualization platform',
    });
  });

  it('should omit href for non-exposed apps without RUNTIPI_HOST', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      openPort: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'runtipi.categories': 'data',
      'runtipi.name': 'Grafana',
      'runtipi.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'runtipi.short_desc': 'Data visualization platform',
    });
    expect(labels['runtipi.href']).toBeUndefined();
  });

  it('should omit href for apps with no exposure configuration', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels).toEqual({
      'runtipi.categories': 'data',
      'runtipi.name': 'Grafana',
      'runtipi.icon': 'http://runtipi:3000/api/marketplace/apps/grafana:store-id/image',
      'runtipi.short_desc': 'Data visualization platform',
    });
    expect(labels['runtipi.href']).toBeUndefined();
  });

  it('should prioritize internet exposure over local exposure', () => {
    const builder = new AppLabelsBuilder({
      appId: 'grafana',
      storeId: 'store-id',
      appName: 'Grafana',
      appDescription: 'Data visualization platform',
      categories: ['data'],
      internalPort: 3000,
      exposed: true,
      domain: 'grafana.example.com',
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['runtipi.href']).toBe('https://grafana.example.com');
  });

  it('should use raw category values without transformation', () => {
    const testCases = ['media', 'network', 'data', 'development', 'automation', 'utilities', 'photography', 'security', 'books', 'music', 'finance', 'gaming', 'ai', 'unknown'];

    testCases.forEach((category) => {
      const builder = new AppLabelsBuilder({
        appId: 'test',
        storeId: 'store',
        appName: 'Test',
        appDescription: 'Test app',
        categories: [category],
        exposedLocal: true,
        localDomain: '${LOCAL_DOMAIN}',
      });

      expect(builder.build()['runtipi.categories']).toBe(category);
    });
  });

  it('should handle multiple categories as comma-delimited string', () => {
    const builder = new AppLabelsBuilder({
      appId: 'signal-k',
      storeId: 'marine-store',
      appName: 'Signal K Server',
      appDescription: 'Marine data platform',
      categories: ['network', 'data', 'utilities'],
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['runtipi.categories']).toBe('network,data,utilities');
  });

  it('should omit categories label when array is empty', () => {
    const builder = new AppLabelsBuilder({
      appId: 'test',
      storeId: 'store',
      appName: 'Test App',
      appDescription: 'Test application',
      categories: [],
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['runtipi.categories']).toBeUndefined();
    expect(labels['runtipi.name']).toBe('Test App');
  });

  it('should handle special characters in app names', () => {
    const builder = new AppLabelsBuilder({
      appId: 'signal-k',
      storeId: 'marine-store',
      appName: 'Signal K Server',
      appDescription: 'Marine data platform & more',
      categories: ['network'],
      exposedLocal: true,
      localDomain: '${LOCAL_DOMAIN}',
    });

    const labels = builder.build();

    expect(labels['runtipi.name']).toBe('Signal K Server');
    expect(labels['runtipi.short_desc']).toBe('Marine data platform & more');
  });
});
