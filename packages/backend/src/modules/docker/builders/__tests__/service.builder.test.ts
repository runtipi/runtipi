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

    expect(service).not.toHaveProperty('container_name');
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

  describe('Volume Mount Propagation', () => {
    let service: ServiceBuilder;

    beforeEach(() => {
      service = new ServiceBuilder().setName('test').setImage('test');
    });

    describe('Legacy boolean flags (backward compatibility)', () => {
      it('should handle shared flag', () => {
        const built = service.setVolume({ hostPath: '/host', containerPath: '/container', shared: true }).build();

        expect(built.volumes).toEqual(['/host:/container:z']);
      });

      it('should handle private flag', () => {
        const built = service.setVolume({ hostPath: '/host', containerPath: '/container', private: true }).build();

        expect(built.volumes).toEqual(['/host:/container:Z']);
      });

      it('should throw error when both shared and private are set', () => {
        expect(() => {
          service.setVolume({
            hostPath: '/host',
            containerPath: '/container',
            shared: true,
            private: true,
          });
        }).toThrowError('Only one of shared or private can be set');
      });

      it('should combine readOnly with legacy flags', () => {
        const built = service.setVolume({ hostPath: '/host', containerPath: '/container', readOnly: true, shared: true }).build();

        expect(built.volumes).toEqual(['/host:/container:ro:z']);
      });
    });

    describe('New bind mount propagation', () => {
      it('should handle rshared propagation mode', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            bind: { propagation: 'rshared' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            bind: { propagation: 'rshared' },
          },
        ]);
      });

      it('should handle shared propagation mode', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            bind: { propagation: 'shared' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            bind: { propagation: 'shared' },
          },
        ]);
      });

      it('should handle private propagation mode', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            bind: { propagation: 'private' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            bind: { propagation: 'private' },
          },
        ]);
      });

      it('should handle rprivate propagation mode', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            bind: { propagation: 'rprivate' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            bind: { propagation: 'rprivate' },
          },
        ]);
      });

      it('should handle rslave propagation mode', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            bind: { propagation: 'rslave' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            bind: { propagation: 'rslave' },
          },
        ]);
      });

      it('should handle slave propagation mode', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            bind: { propagation: 'slave' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            bind: { propagation: 'slave' },
          },
        ]);
      });

      it('should combine readOnly with bind propagation', () => {
        const built = service
          .setVolume({
            hostPath: '/host',
            containerPath: '/container',
            readOnly: true,
            bind: { propagation: 'rshared' },
          })
          .build();

        expect(built.volumes).toEqual([
          {
            type: 'bind',
            source: '/host',
            target: '/container',
            read_only: true,
            bind: { propagation: 'rshared' },
          },
        ]);
      });

      it('should throw error when mixing legacy flags with bind propagation', () => {
        expect(() => {
          service.setVolume({
            hostPath: '/host',
            containerPath: '/container',
            shared: true,
            bind: { propagation: 'rshared' },
          });
        }).toThrowError('Cannot use both legacy flags (shared/private) and new bind.propagation simultaneously');
      });
    });

    describe('Basic volume mounts', () => {
      it('should handle basic volume without any flags', () => {
        const built = service.setVolume({ hostPath: '/host', containerPath: '/container' }).build();

        expect(built.volumes).toEqual(['/host:/container']);
      });

      it('should handle readOnly alone', () => {
        const built = service.setVolume({ hostPath: '/host', containerPath: '/container', readOnly: true }).build();

        expect(built.volumes).toEqual(['/host:/container:ro']);
      });
    });
  });
});
