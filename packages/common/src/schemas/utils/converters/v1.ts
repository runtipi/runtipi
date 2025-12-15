import { type } from 'arktype';
import type { DynamicCompose, Service } from '../../dynamic-compose.js';

export const serviceSchemaV1 = type({
  image: 'string',
  name: 'string',
  internalPort: type.or('string', 'number').optional(),
  isMain: 'boolean?',
  networkMode: 'string?',
  extraHosts: 'string[]?',
  ulimits: type({
    nproc: type.or('number', type({ soft: 'number', hard: 'number' })).optional(),
    nofile: type.or('number', type({ soft: 'number', hard: 'number' })).optional(),
    core: type.or('number', type({ soft: 'number', hard: 'number' })).optional(),
    memlock: type.or('number', type({ soft: 'number', hard: 'number' })).optional(),
  }).optional(),
  addToMainNetwork: 'boolean?',
  addPorts: type({
    containerPort: type.or('string', 'number'),
    hostPort: type.or('string', 'number'),
    udp: 'boolean?',
    tcp: 'boolean?',
    interface: 'string?',
  })
    .array()
    .optional(),
  command: type.or('string', 'string[]').optional(),
  volumes: type({
    hostPath: 'string',
    containerPath: 'string',
    readOnly: 'boolean?',
    shared: 'boolean?',
    private: 'boolean?',
  })
    .array()
    .optional(),
  environment: type({ '[string]': type.or('string', 'number') }).optional(),
  sysctls: type({ '[string]': 'number' }).optional(),
  healthCheck: type({
    test: 'string',
    interval: 'string?',
    timeout: 'string?',
    retries: 'number?',
    startInterval: 'string?',
    startPeriod: 'string?',
  }).optional(),
  dependsOn: type
    .or(
      'string[]',
      type({
        '[string]': type({
          condition: type("'service_healthy' | 'service_started' | 'service_completed_successfully'"),
        }),
      }),
    )
    .optional(),
  capAdd: 'string[]?',
  deploy: type({
    resources: {
      limits: type({
        cpus: 'string?',
        memory: 'string?',
        pids: 'number?',
      }).optional(),
      reservations: type({
        cpus: 'string?',
        memory: 'string?',
        devices: type({
          capabilities: 'string[]',
          driver: 'string?',
          count: type.or(type("'all'"), 'number').optional(),
          deviceIds: 'string[]?',
        }).array(),
      }).optional(),
    },
  }).optional(),
  hostname: 'string?',
  devices: 'string[]?',
  entrypoint: type.or('string', 'string[]').optional(),
  pid: 'string?',
  privileged: 'boolean?',
  tty: 'boolean?',
  user: 'string?',
  workingDir: 'string?',
  shmSize: 'string?',
  capDrop: 'string[]?',
  logging: type({
    driver: 'string',
    options: type({ '[string]': 'string' }).optional(),
  }).optional(),
  readOnly: 'boolean?',
  securityOpt: 'string[]?',
  stopSignal: 'string?',
  stopGracePeriod: 'string?',
  stdinOpen: 'boolean?',
  extraLabels: type({ '[string]': type.or('string', 'boolean') }).optional(),
  dns: type.or('string', 'string[]').optional(),
});

export const dynamicComposeSchemaV1 = type({
  schemaVersion: 'undefined?',
  services: serviceSchemaV1.array(),
  overrides: type({
    architecture: type("'arm64' | 'amd64'").optional(),
    services: type(serviceSchemaV1).partial().array(),
  })
    .array()
    .optional(),
});

type ServiceV1 = typeof serviceSchemaV1.infer;
type DynamicComposeV1 = typeof dynamicComposeSchemaV1.infer;

const serviceV1ToLatest = (service: Partial<ServiceV1>): Service => {
  const { environment, addPorts, ...rest } = service;

  const newService: Partial<Service> = { ...rest };

  if (environment) {
    newService.environment = Object.entries(environment || {}).map(([key, value]) => ({ key, value }));
  }

  if (addPorts) {
    newService.addPorts = addPorts.map((port) => ({
      ...port,
      containerPort: Number(port.containerPort),
      hostPort: Number(port.hostPort),
    }));
  }

  return { ...newService } as Service;
};

const overrideV1ToLatest = (overrides: DynamicComposeV1['overrides']): DynamicCompose['overrides'] => {
  if (!overrides) return undefined;

  const newOverrides: NonNullable<DynamicCompose['overrides']> = [];

  for (const legacyOverride of overrides) {
    const { architecture, services } = legacyOverride;
    const newServices = services.map(serviceV1ToLatest);
    newOverrides.push({ architecture, services: newServices });
  }

  return newOverrides;
};

export const composeV1ToLatest = (result: DynamicComposeV1): DynamicCompose => {
  const convertedServices: Service[] = [];
  let convertedOverrides: DynamicCompose['overrides'];

  for (const service of result.services) {
    convertedServices.push(serviceV1ToLatest(service));
  }

  if (result.overrides) {
    convertedOverrides = overrideV1ToLatest(result.overrides);
  }

  return { schemaVersion: 2, services: convertedServices, overrides: convertedOverrides };
};
