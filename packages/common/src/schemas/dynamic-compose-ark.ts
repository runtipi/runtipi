import { type } from 'arktype';

export const serviceSchemaArk = type({
  // Required fields
  image: 'string',
  name: 'string',
  internalPort: '0 < number < 65536',

  // Optional fields
  'isMain?': 'boolean',
  'networkMode?': 'string',
  'extraHosts?': 'string[]',
  'ulimits?': {
    'nproc?': type.or('number', { soft: 'number', hard: 'number' }),
    'nofile?': type.or('number', { soft: 'number', hard: 'number' }),
    'core?': type.or('number', { soft: 'number', hard: 'number' }),
    'memlock?': type.or('number', { soft: 'number', hard: 'number' }),
  },
  'addToMainNetwork?': 'boolean',
  'addPorts?': type({
    containerPort: '0 < number < 65536',
    hostPort: '0 < number < 65536',
    'udp?': 'boolean',
    'tcp?': 'boolean',
    'interface?': 'string',
  }).array(),
  'command?': 'string | string[]',
  'volumes?': type({
    hostPath: 'string',
    containerPath: 'string',
    'readOnly?': 'boolean',
    'shared?': 'boolean',
    'private?': 'boolean',
  }).array(),
  'environment?': type({
    key: 'string > 0',
    value: 'string > 0 | number | boolean',
  }).array(),
  'sysctls?': { '[string]': 'number' },
  'healthCheck?': {
    test: 'string',
    'interval?': 'string',
    'timeout?': 'string',
    'retries?': 'number',
    'startInterval?': 'string',
    'startPeriod?': 'string',
  },
  'dependsOn?': type.or('string[]', {
    '[string]': {
      condition: "'service_healthy' | 'service_started' | 'service_completed_successfully'",
    },
  }),
  'capAdd?': 'string[]',
  'deploy?': {
    resources: {
      'limits?': {
        'cpus?': 'string',
        'memory?': 'string',
        'pids?': 'number',
      },
      'reservations?': {
        'cpus?': 'string',
        'memory?': 'string',
        devices: type({
          capabilities: 'string[]',
          'driver?': 'string',
          'count?': "'all' | number",
          'deviceIds?': 'string[]',
        }).array(),
      },
    },
  },
  'hostname?': 'string',
  'devices?': 'string[]',
  'entrypoint?': 'string | string[]',
  'pid?': 'string',
  'privileged?': 'boolean',
  'tty?': 'boolean',
  'user?': 'string',
  'workingDir?': 'string',
  'shmSize?': 'string',
  'capDrop?': 'string[]',
  'logging?': {
    driver: 'string',
    'options?': { '[string]': 'string' },
  },
  'readOnly?': 'boolean',
  'securityOpt?': 'string[]',
  'stopSignal?': 'string',
  'stopGracePeriod?': 'string',
  'stdinOpen?': 'boolean',
  'extraLabels?': { '[string]': 'string | boolean' },
  'dns?': 'string | string[]',
});

// dynamicComposeSchemaV2
export const dynamicComposeSchemaArk = type({
  schemaVersion: type.unit(2),
  services: type(serviceSchemaArk).array().moreThanLength(0),
  'overrides?': type({
    'architecture?': "'arm64' | 'amd64'",
    services: type(serviceSchemaArk).partial().array(),
  }).array(),
});
