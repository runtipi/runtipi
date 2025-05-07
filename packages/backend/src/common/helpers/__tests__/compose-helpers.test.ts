import type { Architecture } from '@/common/constants';
import type { ServiceInput } from '@runtipi/common/schemas';
import { describe, expect, it } from 'vitest';
import { mergeArchitectureOverrides } from '../compose-helpers';

describe('mergeArchitectureOverrides', () => {
  const baseServices: ServiceInput[] = [
    {
      name: 'app',
      image: 'app:latest',
      isMain: true,
      internalPort: 80,
    },
    {
      name: 'db',
      image: 'mysql:latest',
      environment: {
        MYSQL_ROOT_PASSWORD: 'password',
      },
    },
  ];

  it('should return base services if no overrides are provided', () => {
    const result = mergeArchitectureOverrides(baseServices, [], 'amd64');
    expect(result).toEqual(baseServices);
  });

  it('should return base services if no matching architecture override is found', () => {
    const overrides = [
      {
        architecture: 'arm64' as Architecture,
        services: [
          {
            name: 'app',
            image: 'app:arm64-latest',
          },
        ],
      },
    ];

    const result = mergeArchitectureOverrides(baseServices, overrides, 'amd64');
    expect(result).toEqual(baseServices);
  });

  it('should correctly merge arm64 overrides on arm64 architecture', () => {
    const overrides = [
      {
        architecture: 'arm64' as Architecture,
        services: [
          {
            name: 'app',
            image: 'app:arm64-latest',
            environment: {
              ENV_VAR: 'arm64-value',
            },
          },
        ],
      },
    ];

    const expected = [
      {
        name: 'app',
        image: 'app:arm64-latest', // Overridden
        isMain: true,
        internalPort: 80,
        environment: {
          ENV_VAR: 'arm64-value', // Added from override
        },
      },
      {
        name: 'db',
        image: 'mysql:latest',
        environment: {
          MYSQL_ROOT_PASSWORD: 'password',
        },
      },
    ];

    const result = mergeArchitectureOverrides(baseServices, overrides, 'arm64');
    expect(result).toEqual(expected);
  });

  it('should correctly merge amd64 overrides on amd64 architecture', () => {
    const overrides = [
      {
        architecture: 'amd64' as Architecture,
        services: [
          {
            name: 'app',
            image: 'app:amd64-latest',
            environment: {
              ENV_VAR: 'amd64-value',
            },
          },
        ],
      },
    ];

    const expected = [
      {
        name: 'app',
        image: 'app:amd64-latest', // Overridden
        isMain: true,
        internalPort: 80,
        environment: {
          ENV_VAR: 'amd64-value', // Added from override
        },
      },
      {
        name: 'db',
        image: 'mysql:latest',
        environment: {
          MYSQL_ROOT_PASSWORD: 'password',
        },
      },
    ];

    const result = mergeArchitectureOverrides(baseServices, overrides, 'amd64');
    expect(result).toEqual(expected);
  });

  it('should replace arrays rather than merging them', () => {
    const baseServicesWithArray: ServiceInput[] = [
      {
        name: 'app',
        image: 'app:latest',
        volumes: [
          {
            hostPath: '/data',
            containerPath: '/app/data',
          },
        ],
      },
    ];

    const overrides = [
      {
        architecture: 'arm64' as Architecture,
        services: [
          {
            name: 'app',
            volumes: [
              {
                hostPath: '/arm64-data',
                containerPath: '/app/arm64-data',
              },
            ],
          },
        ],
      },
    ];

    const expected = [
      {
        name: 'app',
        image: 'app:latest',
        volumes: [
          {
            hostPath: '/arm64-data',
            containerPath: '/app/arm64-data',
          },
        ],
      },
    ];

    const result = mergeArchitectureOverrides(baseServicesWithArray, overrides, 'arm64');
    expect(result).toEqual(expected);
  });

  it('should handle multiple architecture overrides', () => {
    const overrides = [
      {
        architecture: 'arm64' as Architecture,
        services: [
          {
            name: 'app',
            image: 'app:arm64-latest',
          },
        ],
      },
      {
        architecture: 'amd64' as Architecture,
        services: [
          {
            name: 'app',
            image: 'app:amd64-latest',
          },
        ],
      },
    ];

    const arm64Result = mergeArchitectureOverrides(baseServices, overrides, 'arm64');
    expect(arm64Result[0]?.image).toEqual('app:arm64-latest');

    const amd64Result = mergeArchitectureOverrides(baseServices, overrides, 'amd64');
    expect(amd64Result[0]?.image).toEqual('app:amd64-latest');
  });

  it('should ignore services in overrides that are not in base services', () => {
    const overrides = [
      {
        architecture: 'amd64' as Architecture,
        services: [
          {
            name: 'nonexistent',
            image: 'nonexistent:latest',
          },
        ],
      },
    ];

    const result = mergeArchitectureOverrides(baseServices, overrides, 'amd64');
    expect(result).toEqual(baseServices);
  });

  it('should ignore overrides without a name property', () => {
    const overrides = [
      {
        architecture: 'amd64' as Architecture,
        services: [
          {
            image: 'app:amd64-latest',
          },
        ],
      },
    ];

    const result = mergeArchitectureOverrides(baseServices, overrides, 'amd64');
    expect(result).toEqual(baseServices);
  });
});
