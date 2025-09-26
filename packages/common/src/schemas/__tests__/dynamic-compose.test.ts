import { describe, it, expect } from 'vitest';

import { serviceSchema as serviceSchemaZod, dynamicComposeSchema as dynamicComposeSchemaZod } from '../dynamic-compose.js';
import { dynamicComposeSchemaArk, serviceSchemaArk } from '../dynamic-compose-ark.js';
import type { ZodAny } from 'zod';
import { type } from 'arktype';

type ValidationResult<T> = { success: true; data: T } | { success: false };

function safeParseZod<T>(schema: ZodAny, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  return result.success ? { success: true, data: result.data } : { success: false };
}

// biome-ignore lint/suspicious/noExplicitAny: excessive depth
function safeParseArk<T>(schema: any, data: unknown): ValidationResult<T> {
  const result = schema(data);

  if (result instanceof type.errors) {
    return { success: false };
  }

  return { success: true, data: result as T };
}

const schemas = [
  { name: 'Zod', serviceSchema: serviceSchemaZod, dynamicComposeSchema: dynamicComposeSchemaZod, safeParse: safeParseZod },
  { name: 'Ark', serviceSchema: serviceSchemaArk, dynamicComposeSchema: dynamicComposeSchemaArk, safeParse: safeParseArk },
];

schemas.forEach(({ name, serviceSchema, dynamicComposeSchema, safeParse }) => {
  describe(`DynamicCompose Schema Tests with ${name}`, () => {
    describe('Service Schema V2', () => {
      describe('Required Fields', () => {
        it('should validate minimal valid service', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toMatchInlineSnapshot(`
              {
                "image": "nginx:latest",
                "internalPort": 80,
                "name": "web-server",
              }
            `);
          }
        });

        it('should require image field', () => {
          const service = {
            name: 'web-server',
            internalPort: 80,
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });

        it('should require name field', () => {
          const service = {
            image: 'nginx:latest',
            internalPort: 80,
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });

        it('should require internalPort field', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });
      });

      describe('Port Validation', () => {
        it('should validate port range 1-65535', () => {
          const validPorts = [1, 80, 443, 8080, 65535];

          for (const port of validPorts) {
            const service = {
              image: 'nginx:latest',
              name: 'web-server',
              internalPort: port,
            };

            const result = safeParse(serviceSchema, service);
            expect(result.success).toBe(true);
          }
        });

        it('should reject invalid port numbers', () => {
          const invalidPorts = [0, -1, 65536, 70000];

          for (const port of invalidPorts) {
            const service = {
              image: 'nginx:latest',
              name: 'web-server',
              internalPort: port,
            };

            const result = safeParse(serviceSchema, service);
            expect(result.success).toBe(false);
          }
        });

        it('should reject non-numeric ports', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 'not-a-number',
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });
      });

      describe('Environment Variables', () => {
        it('should validate valid environment variables', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            environment: [
              { key: 'NODE_ENV', value: 'production' },
              { key: 'PORT', value: '8080' },
              { key: 'DB_HOST', value: 'localhost' },
            ],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });

        it('should reject empty environment key', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            environment: [{ key: '', value: 'production' }],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });

        it('should reject empty environment value', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            environment: [{ key: 'NODE_ENV', value: '' }],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });
      });

      describe('Volumes Configuration', () => {
        it('should validate volumes with all options', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            volumes: [
              {
                hostPath: '/host/path',
                containerPath: '/container/path',
                type: 'bind' as const,
                readOnly: true,
              },
            ],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });

        it('should require hostPath and containerPath', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            volumes: [
              {
                type: 'bind' as const,
              },
            ],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });
      });

      describe('Command Configuration', () => {
        it('should accept string command', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            command: 'nginx -g "daemon off;"',
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });

        it('should accept array command', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            command: ['nginx', '-g', 'daemon off;'],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });
      });

      describe('Health Check Configuration', () => {
        it('should validate complete health check', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            healthCheck: {
              test: 'curl -f http://localhost/',
              interval: '30s',
              timeout: '10s',
              retries: 3,
              startPeriod: '60s',
            },
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });

        it('should require test field in health check', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            healthCheck: {
              interval: '30s',
              timeout: '10s',
              retries: 3,
            },
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });
      });

      describe('DependsOn Configuration', () => {
        it('should validate depends_on as array', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            dependsOn: ['database', 'redis'],
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });

        it('should validate depends_on as object with conditions', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            dependsOn: {
              database: { condition: 'service_healthy' },
              redis: { condition: 'service_started' },
            },
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(true);
        });

        it('should reject invalid condition values', () => {
          const service = {
            image: 'nginx:latest',
            name: 'web-server',
            internalPort: 80,
            dependsOn: {
              database: { condition: 'invalid_condition' },
            },
          };

          const result = safeParse(serviceSchema, service);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('DynamicCompose Schema V2', () => {
      describe('Basic Structure', () => {
        it('should validate minimal dynamic compose', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [
              {
                image: 'nginx:latest',
                name: 'web',
                internalPort: 80,
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toMatchInlineSnapshot(`
              {
                "schemaVersion": 2,
                "services": [
                  {
                    "image": "nginx:latest",
                    "internalPort": 80,
                    "name": "web",
                  },
                ],
              }
            `);
          }
        });

        it('should validate complex dynamic compose with all features', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [
              {
                // Required fields
                image: 'nginx:alpine',
                name: 'web-server',
                internalPort: 80,

                // Service configuration
                isMain: true,
                networkMode: 'bridge',
                addToMainNetwork: true,
                hostname: 'web-server.local',

                // Resource limits and deployment
                deploy: {
                  resources: {
                    limits: {
                      cpus: '0.5',
                      memory: '512M',
                      pids: 100,
                    },
                    reservations: {
                      cpus: '0.25',
                      memory: '256M',
                      devices: [
                        {
                          capabilities: ['gpu'],
                          driver: 'nvidia',
                          count: 1,
                          deviceIds: ['GPU-12345'],
                        },
                      ],
                    },
                  },
                },

                // Ports configuration
                addPorts: [
                  {
                    containerPort: 8080,
                    hostPort: 8080,
                    tcp: true,
                    interface: '0.0.0.0',
                  },
                  {
                    containerPort: 9090,
                    hostPort: 9090,
                    udp: true,
                  },
                ],

                // Command and entrypoint
                command: ['nginx', '-g', 'daemon off;'],
                entrypoint: ['/docker-entrypoint.sh'],

                // Volumes
                volumes: [
                  {
                    hostPath: '/host/config',
                    containerPath: '/etc/nginx/conf.d',
                    readOnly: true,
                    shared: false,
                    private: true,
                  },
                  {
                    hostPath: '/host/data',
                    containerPath: '/var/www/html',
                    readOnly: false,
                  },
                ],

                // Environment variables
                environment: [
                  { key: 'NODE_ENV', value: 'production' },
                  { key: 'PORT', value: 8080 },
                  { key: 'DEBUG', value: true },
                  { key: 'MAX_CONNECTIONS', value: 1000 },
                ],

                // Network and security
                extraHosts: ['host.docker.internal:host-gateway', 'api.local:192.168.1.100'],
                dns: ['8.8.8.8', '1.1.1.1'],

                // System configuration
                sysctls: {
                  'net.core.somaxconn': 1024,
                  'net.ipv4.tcp_syncookies': 1,
                },

                // Resource limits
                ulimits: {
                  nproc: { soft: 65536, hard: 65536 },
                  nofile: 20000,
                  core: 0,
                  memlock: { soft: -1, hard: -1 },
                },

                // Health check
                healthCheck: {
                  test: 'curl -f http://localhost:80/health || exit 1',
                  interval: '30s',
                  timeout: '10s',
                  retries: 3,
                  startInterval: '5s',
                  startPeriod: '60s',
                },

                // Dependencies
                dependsOn: {
                  database: { condition: 'service_healthy' },
                  redis: { condition: 'service_started' },
                },

                // Security and capabilities
                capAdd: ['NET_ADMIN', 'SYS_TIME'],
                capDrop: ['MKNOD', 'SYS_CHROOT'],
                privileged: false,
                securityOpt: ['no-new-privileges:true', 'apparmor:unconfined'],

                // Process configuration
                pid: 'host',
                user: '1000:1000',
                workingDir: '/app',
                tty: true,
                stdinOpen: true,
                readOnly: false,

                // Memory and storage
                shmSize: '64m',
                devices: ['/dev/snd:/dev/snd:rwm'],

                // Logging
                logging: {
                  driver: 'json-file',
                  options: {
                    'max-size': '10m',
                    'max-file': '3',
                  },
                },

                // Process management
                stopSignal: 'SIGTERM',
                stopGracePeriod: '10s',

                // Labels
                extraLabels: {
                  'app.version': '1.0.0',
                  maintainer: 'team@example.com',
                  production: true,
                },
              },
              {
                // Secondary service with minimal configuration
                image: 'postgres:14',
                name: 'database',
                internalPort: 5432,
                environment: [
                  { key: 'POSTGRES_DB', value: 'myapp' },
                  { key: 'POSTGRES_USER', value: 'dbuser' },
                  { key: 'POSTGRES_PASSWORD', value: 'secret123' },
                ],
                volumes: [
                  {
                    hostPath: '/host/postgres-data',
                    containerPath: '/var/lib/postgresql/data',
                  },
                ],
                healthCheck: {
                  test: 'pg_isready -U dbuser -d myapp',
                  interval: '10s',
                  timeout: '5s',
                  retries: 5,
                },
              },
              {
                // Third service with array-style depends_on
                image: 'redis:alpine',
                name: 'redis',
                internalPort: 6379,
                dependsOn: ['database'],
                command: 'redis-server --appendonly yes',
                volumes: [
                  {
                    hostPath: '/host/redis-data',
                    containerPath: '/data',
                  },
                ],
              },
            ],

            // Architecture overrides
            overrides: [
              {
                architecture: 'arm64',
                services: [
                  {
                    image: 'nginx:alpine-arm64v8',
                    name: 'web-server',
                  },
                ],
              },
              {
                architecture: 'amd64',
                services: [
                  {
                    image: 'nginx:alpine-amd64',
                    name: 'web-server',
                    deploy: {
                      resources: {
                        limits: {
                          cpus: '1.0',
                          memory: '1G',
                        },
                      },
                    },
                  },
                ],
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toMatchInlineSnapshot(`
              {
                "overrides": [
                  {
                    "architecture": "arm64",
                    "services": [
                      {
                        "image": "nginx:alpine-arm64v8",
                        "name": "web-server",
                      },
                    ],
                  },
                  {
                    "architecture": "amd64",
                    "services": [
                      {
                        "deploy": {
                          "resources": {
                            "limits": {
                              "cpus": "1.0",
                              "memory": "1G",
                            },
                          },
                        },
                        "image": "nginx:alpine-amd64",
                        "name": "web-server",
                      },
                    ],
                  },
                ],
                "schemaVersion": 2,
                "services": [
                  {
                    "addPorts": [
                      {
                        "containerPort": 8080,
                        "hostPort": 8080,
                        "interface": "0.0.0.0",
                        "tcp": true,
                      },
                      {
                        "containerPort": 9090,
                        "hostPort": 9090,
                        "udp": true,
                      },
                    ],
                    "addToMainNetwork": true,
                    "capAdd": [
                      "NET_ADMIN",
                      "SYS_TIME",
                    ],
                    "capDrop": [
                      "MKNOD",
                      "SYS_CHROOT",
                    ],
                    "command": [
                      "nginx",
                      "-g",
                      "daemon off;",
                    ],
                    "dependsOn": {
                      "database": {
                        "condition": "service_healthy",
                      },
                      "redis": {
                        "condition": "service_started",
                      },
                    },
                    "deploy": {
                      "resources": {
                        "limits": {
                          "cpus": "0.5",
                          "memory": "512M",
                          "pids": 100,
                        },
                        "reservations": {
                          "cpus": "0.25",
                          "devices": [
                            {
                              "capabilities": [
                                "gpu",
                              ],
                              "count": 1,
                              "deviceIds": [
                                "GPU-12345",
                              ],
                              "driver": "nvidia",
                            },
                          ],
                          "memory": "256M",
                        },
                      },
                    },
                    "devices": [
                      "/dev/snd:/dev/snd:rwm",
                    ],
                    "dns": [
                      "8.8.8.8",
                      "1.1.1.1",
                    ],
                    "entrypoint": [
                      "/docker-entrypoint.sh",
                    ],
                    "environment": [
                      {
                        "key": "NODE_ENV",
                        "value": "production",
                      },
                      {
                        "key": "PORT",
                        "value": 8080,
                      },
                      {
                        "key": "DEBUG",
                        "value": true,
                      },
                      {
                        "key": "MAX_CONNECTIONS",
                        "value": 1000,
                      },
                    ],
                    "extraHosts": [
                      "host.docker.internal:host-gateway",
                      "api.local:192.168.1.100",
                    ],
                    "extraLabels": {
                      "app.version": "1.0.0",
                      "maintainer": "team@example.com",
                      "production": true,
                    },
                    "healthCheck": {
                      "interval": "30s",
                      "retries": 3,
                      "startInterval": "5s",
                      "startPeriod": "60s",
                      "test": "curl -f http://localhost:80/health || exit 1",
                      "timeout": "10s",
                    },
                    "hostname": "web-server.local",
                    "image": "nginx:alpine",
                    "internalPort": 80,
                    "isMain": true,
                    "logging": {
                      "driver": "json-file",
                      "options": {
                        "max-file": "3",
                        "max-size": "10m",
                      },
                    },
                    "name": "web-server",
                    "networkMode": "bridge",
                    "pid": "host",
                    "privileged": false,
                    "readOnly": false,
                    "securityOpt": [
                      "no-new-privileges:true",
                      "apparmor:unconfined",
                    ],
                    "shmSize": "64m",
                    "stdinOpen": true,
                    "stopGracePeriod": "10s",
                    "stopSignal": "SIGTERM",
                    "sysctls": {
                      "net.core.somaxconn": 1024,
                      "net.ipv4.tcp_syncookies": 1,
                    },
                    "tty": true,
                    "ulimits": {
                      "core": 0,
                      "memlock": {
                        "hard": -1,
                        "soft": -1,
                      },
                      "nofile": 20000,
                      "nproc": {
                        "hard": 65536,
                        "soft": 65536,
                      },
                    },
                    "user": "1000:1000",
                    "volumes": [
                      {
                        "containerPath": "/etc/nginx/conf.d",
                        "hostPath": "/host/config",
                        "private": true,
                        "readOnly": true,
                        "shared": false,
                      },
                      {
                        "containerPath": "/var/www/html",
                        "hostPath": "/host/data",
                        "readOnly": false,
                      },
                    ],
                    "workingDir": "/app",
                  },
                  {
                    "environment": [
                      {
                        "key": "POSTGRES_DB",
                        "value": "myapp",
                      },
                      {
                        "key": "POSTGRES_USER",
                        "value": "dbuser",
                      },
                      {
                        "key": "POSTGRES_PASSWORD",
                        "value": "secret123",
                      },
                    ],
                    "healthCheck": {
                      "interval": "10s",
                      "retries": 5,
                      "test": "pg_isready -U dbuser -d myapp",
                      "timeout": "5s",
                    },
                    "image": "postgres:14",
                    "internalPort": 5432,
                    "name": "database",
                    "volumes": [
                      {
                        "containerPath": "/var/lib/postgresql/data",
                        "hostPath": "/host/postgres-data",
                      },
                    ],
                  },
                  {
                    "command": "redis-server --appendonly yes",
                    "dependsOn": [
                      "database",
                    ],
                    "image": "redis:alpine",
                    "internalPort": 6379,
                    "name": "redis",
                    "volumes": [
                      {
                        "containerPath": "/data",
                        "hostPath": "/host/redis-data",
                      },
                    ],
                  },
                ],
              }
            `);
          }
        });

        it('should require schemaVersion 2', () => {
          const compose = {
            schemaVersion: 1,
            services: [
              {
                image: 'nginx:latest',
                name: 'web',
                internalPort: 80,
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(false);
        });

        it('should require at least one service', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(false);
        });

        it('should validate multiple services', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [
              {
                image: 'nginx:latest',
                name: 'web',
                internalPort: 80,
              },
              {
                image: 'postgres:14',
                name: 'database',
                internalPort: 5432,
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(true);
        });
      });

      describe('Overrides Configuration', () => {
        it('should validate overrides with architecture', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [
              {
                image: 'nginx:latest',
                name: 'web',
                internalPort: 80,
              },
            ],
            overrides: [
              {
                architecture: 'arm64',
                services: [
                  {
                    image: 'nginx:latest-arm64',
                    name: 'web',
                    internalPort: 80,
                  },
                ],
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(true);
        });

        it('should validate overrides without architecture', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [
              {
                image: 'nginx:latest',
                name: 'web',
                internalPort: 80,
              },
            ],
            overrides: [
              {
                services: [
                  {
                    image: 'nginx:alpine',
                    name: 'web',
                    internalPort: 80,
                  },
                ],
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(true);
        });

        it('should reject invalid override structure', () => {
          const compose = {
            schemaVersion: 2 as const,
            services: [
              {
                image: 'nginx:latest',
                name: 'web',
                internalPort: 80,
              },
            ],
            overrides: [
              {
                architecture: 'x86', // invalid architecture value
                services: [{}], // incomplete service
              },
            ],
          };

          const result = safeParse(dynamicComposeSchema, compose);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('Edge Cases and Error Conditions', () => {
      it('should handle null and undefined values appropriately', () => {
        const testCases = [
          null,
          undefined,
          { schemaVersion: 2, services: null },
          { schemaVersion: 2, services: undefined },
          { schemaVersion: null, services: [] },
        ];

        for (const testCase of testCases) {
          const result = safeParse(dynamicComposeSchema, testCase);
          expect(result.success).toBe(false);
        }
      });

      it('should handle malformed data structures', () => {
        const testCases = [
          'string',
          123,
          [],
          { schemaVersion: '2', services: 'not-array' },
          { schemaVersion: 2, services: [{ invalid: 'service' }] },
        ];

        for (const testCase of testCases) {
          const result = safeParse(dynamicComposeSchema, testCase);
          expect(result.success).toBe(false);
        }
      });
    });

    describe('Schema Transformation and Version Migration', () => {
      it('should handle V1 to V2 transformation edge cases', () => {
        const edgeCases = [
          // Missing required fields after transformation
          { services: [{ image: 'nginx' }] },
          // Invalid port after transformation
          { services: [{ image: 'nginx', name: 'web', internalPort: 0 }] },
          // Invalid environment after transformation
          { services: [{ image: 'nginx', name: 'web', internalPort: 80, environment: 'invalid' }] },
        ];

        for (const testCase of edgeCases) {
          const result = safeParse(dynamicComposeSchema, testCase);
          expect(result.success).toBe(false);
        }
      });
    });
  });
});
