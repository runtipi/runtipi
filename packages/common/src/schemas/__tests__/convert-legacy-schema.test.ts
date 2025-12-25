import { describe, it, expect } from 'vitest';
import { convertLegacyToYaml } from '../utils/convert-legacy-schema.js';

describe('convertLegacyToYaml', () => {
  it('should correctly convert legacy JSON with overrides to YAML format', () => {
    const legacyJson = {
      services: [
        {
          name: 'gotify',
          image: 'gotify/server:2.7.3',
          isMain: true,
          internalPort: 80,
          environment: [
            {
              key: 'GOTIFY_DEFAULTUSER_NAME',
              value: '${GOTIFY_DEFAULTUSER_NAME}',
            },
            {
              key: 'GOTIFY_DEFAULTUSER_PASS',
              value: '${GOTIFY_DEFAULTUSER_PASS}',
            },
          ],
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data',
              containerPath: '/app/data',
            },
          ],
        },
      ],
      overrides: [
        {
          architecture: 'arm64',
          services: [
            {
              name: 'gotify',
              image: 'gotify/server-arm64:2.6.3',
            },
          ],
        },
      ],
      schemaVersion: 2,
      $schema: 'https://schemas.runtipi.io/v2/dynamic-compose.json',
    };

    const result = convertLegacyToYaml(legacyJson);

    expect(result.services.gotify).toBeDefined();
    expect(result.services?.gotify?.image).toBe('gotify/server:2.7.3');
    expect(result.services?.gotify?.['x-runtipi']).toEqual({
      is_main: true,
      internal_port: 80,
    });
    expect(result.services?.gotify?.environment).toContain('GOTIFY_DEFAULTUSER_NAME=${GOTIFY_DEFAULTUSER_NAME}');
    expect(result.services?.gotify?.volumes).toContain('${APP_DATA_DIR}/data:/app/data');

    expect(result['x-runtipi']?.overrides).toBeDefined();
    expect(result['x-runtipi']?.overrides).toHaveLength(1);
    const arm64Override = result['x-runtipi']?.overrides?.[0];
    expect(arm64Override?.architecture).toBe('arm64');
    expect(arm64Override?.services.gotify).toBeDefined();
    expect(arm64Override?.services?.gotify?.image).toBe('gotify/server-arm64:2.6.3');
  });

  it('should handle V1 schema conversion with overrides', () => {
    const legacyV1 = {
      services: [
        {
          name: 'app',
          image: 'app:latest',
          isMain: true,
          internalPort: 3000,
        },
      ],
      overrides: [
        {
          architecture: 'amd64',
          services: [
            {
              name: 'app',
              image: 'app:amd64-latest',
            },
          ],
        },
      ],
    };

    const result = convertLegacyToYaml(legacyV1);

    expect(result.services?.app?.image).toBe('app:latest');
    expect(result['x-runtipi']?.overrides?.[0]?.architecture).toBe('amd64');
    expect(result['x-runtipi']?.overrides?.[0]?.services?.app?.image).toBe('app:amd64-latest');
  });

  describe('convertLegacyToYaml - Property Name Normalization', () => {
    it('should convert all camelCase properties to snake_case', () => {
      const input = {
        schemaVersion: 2,
        services: [
          {
            name: 'app',
            image: 'app:latest',
            networkMode: 'bridge',
            extraHosts: ['host.docker.internal:host-gateway'],
            workingDir: '/app',
            shmSize: '256m',
            stdinOpen: true,
            capAdd: ['NET_ADMIN'],
            capDrop: ['MKNOD'],
            securityOpt: ['no-new-privileges:true'],
            readOnly: true,
            stopSignal: 'SIGTERM',
            stopGracePeriod: '10s',
          },
        ],
      };

      const result = convertLegacyToYaml(input);
      const service = result.services.app as { [key: string]: unknown };

      expect(service.network_mode).toBe('bridge');
      expect(service.extra_hosts).toBeDefined();
      expect(service.working_dir).toBe('/app');
      expect(service.shm_size).toBe('256m');
      expect(service.stdin_open).toBe(true);
      expect(service.cap_add).toBeDefined();
      expect(service.cap_drop).toBeDefined();
      expect(service.security_opt).toBeDefined();
      expect(service.read_only).toBe(true);
      expect(service.stop_signal).toBe('SIGTERM');
      expect(service.stop_grace_period).toBe('10s');

      // Ensure camelCase versions don't exist
      expect(service.networkMode).toBeUndefined();
      expect(service.extraHosts).toBeUndefined();
      expect(service.workingDir).toBeUndefined();
    });
  });

  describe('convertLegacyToYaml - Volume Conversion', () => {
    it('should convert shared volume flag to :z', () => {
      const input = {
        schemaVersion: 2,
        services: [
          {
            name: 'app',
            image: 'app:latest',
            volumes: [
              {
                hostPath: '/host/path',
                containerPath: '/container/path',
                shared: true,
              },
            ],
          },
        ],
      };

      const result = convertLegacyToYaml(input);
      expect(result.services.app?.volumes).toContain('/host/path:/container/path:z');
    });

    it('should convert private volume flag to :Z', () => {
      const input = {
        schemaVersion: 2,
        services: [
          {
            name: 'app',
            image: 'app:latest',
            volumes: [
              {
                hostPath: '/host/path',
                containerPath: '/container/path',
                private: true,
              },
            ],
          },
        ],
      };

      const result = convertLegacyToYaml(input);
      expect(result.services.app?.volumes).toContain('/host/path:/container/path:Z');
    });

    it('should combine readOnly with shared flag', () => {
      const input = {
        schemaVersion: 2,
        services: [
          {
            name: 'app',
            image: 'app:latest',
            volumes: [
              {
                hostPath: '/host/path',
                containerPath: '/container/path',
                readOnly: true,
                shared: true,
              },
            ],
          },
        ],
      };

      const result = convertLegacyToYaml(input);
      expect(result.services.app?.volumes).toContain('/host/path:/container/path:ro,z');
    });

    it('should handle bind.propagation instead of legacy flags', () => {
      const input = {
        schemaVersion: 2,
        services: [
          {
            name: 'app',
            image: 'app:latest',
            volumes: [
              {
                hostPath: '/host/path',
                containerPath: '/container/path',
                bind: { propagation: 'rshared' },
              },
            ],
          },
        ],
      };

      const result = convertLegacyToYaml(input);
      expect(result.services.app?.volumes).toContain('/host/path:/container/path:rshared');
    });
  });
});
