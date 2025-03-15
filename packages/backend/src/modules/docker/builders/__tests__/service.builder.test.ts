import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';
import { ServiceBuilder } from '../service.builder';

describe('ServiceBuilder', () => {
  let serviceBuilder: ServiceBuilder;

  beforeEach(() => {
    serviceBuilder = new ServiceBuilder();
  });

  it('should build a service', () => {
    const name = faker.lorem.word();
    const image = faker.lorem.word();
    const service = serviceBuilder.setName(name).setImage(image).build();

    expect(service).toHaveProperty('container_name', name);
    expect(service).toHaveProperty('image', image);
  });

  it('should throw an error if the name is not set', () => {
    const image = faker.lorem.word();
    serviceBuilder.setImage(image);

    expect(() => serviceBuilder.build()).toThrowError();
  });

  it('should throw an error if the image is not set', () => {
    const name = faker.lorem.word();
    serviceBuilder.setName(name);

    expect(() => serviceBuilder.build()).toThrowError();
  });

  it('if network_mode is set, it should remove the network and ports', () => {
    const networkMode = faker.lorem.word();
    const service = serviceBuilder
      .setNetworkMode(networkMode)
      .setName('name')
      .setImage('image')
      .setPort({ containerPort: 80, hostPort: 80 })
      .setNetwork('network')
      .build();

    expect(service).toHaveProperty('network_mode', networkMode);
    expect(service).not.toHaveProperty('ports');
    expect(service).not.toHaveProperty('networks');
  });

  describe('interpolateVariables', () => {
    it('should replace RUNTIPI_APP_ID in label values', () => {
      const service = serviceBuilder
        .setName('name')
        .setImage('image')
        .setLabels({ 'runtipi.app_id': '{{RUNTIPI_APP_ID}}' })
        .interpolateVariables('my-app')
        .build();

      expect(service.labels).toEqual({ 'runtipi.app_id': 'my-app' });
    });

    it('should replace RUNTIPI_APP_ID in label keys', () => {
      const service = serviceBuilder
        .setName('name')
        .setImage('image')
        .setLabels({ '{{RUNTIPI_APP_ID}}': 'value' })
        .interpolateVariables('my-app')
        .build();

      expect(service.labels).toEqual({ 'my-app': 'value' });
    });

    it('should replace RUNTIPI_APP_ID in both keys and values', () => {
      const service = serviceBuilder
        .setName('name')
        .setImage('image')
        .setLabels({ '{{RUNTIPI_APP_ID}}': '{{RUNTIPI_APP_ID}}' })
        .interpolateVariables('my-app')
        .build();

      expect(service.labels).toEqual({ 'my-app': 'my-app' });
    });

    it('should handle spaces in the placeholder', () => {
      const service = serviceBuilder
        .setName('name')
        .setImage('image')
        .setLabels({ '{{ RUNTIPI_APP_ID }}': '{{ RUNTIPI_APP_ID }}' })
        .interpolateVariables('my-app')
        .build();

      expect(service.labels).toEqual({ 'my-app': 'my-app' });
    });

    it('should handle multiple replacements in the same value', () => {
      const service = serviceBuilder
        .setName('name')
        .setImage('image')
        .setLabels({ test: '{{RUNTIPI_APP_ID}}-{{RUNTIPI_APP_ID}}' })
        .interpolateVariables('my-app')
        .build();

      expect(service.labels).toEqual({ test: 'my-app-my-app' });
    });
  });
});
