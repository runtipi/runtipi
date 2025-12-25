import { type } from 'arktype';

export const serviceSchemaArk = type({
  // Required fields
  image: type('string').configure({ message: 'CUSTOM_APP_ERROR_IMAGE_REQUIRED' }),
  name: type('string').configure({ message: 'CUSTOM_APP_ERROR_NAME_REQUIRED' }),
  internalPort: type('string | 0 < number.integer < 65536').configure({ message: 'CUSTOM_APP_ERROR_INTERNAL_PORT_INVALID' }).optional(),

  // Optional fields
  isMain: type('boolean').optional(),
  networkMode: type('string').optional(),
  extraHosts: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_EXTRA_HOST_INVALID' }).optional(),
  ulimits: type({
    nproc: type
      .or(
        type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_NPROC_INVALID' }),
        type({
          soft: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID' }),
          hard: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID' }),
        }),
      )
      .optional(),
    nofile: type
      .or(
        type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_NOFILE_INVALID' }),
        type({
          soft: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID' }),
          hard: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID' }),
        }),
      )
      .optional(),
    core: type
      .or(
        type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_CORE_INVALID' }),
        type({
          soft: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID' }),
          hard: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID' }),
        }),
      )
      .optional(),
    memlock: type
      .or(
        type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_MEMLOCK_INVALID' }),
        type({
          soft: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID' }),
          hard: type('number').configure({ message: 'CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID' }),
        }),
      )
      .optional(),
  }).optional(),
  addToMainNetwork: type('boolean').optional(),
  addPorts: type({
    containerPort: type('string | 0 < number.integer < 65536').configure({ message: 'CUSTOM_APP_ERROR_CONTAINER_PORT_INVALID' }),
    hostPort: type('string | 0 < number.integer < 65536').configure({ message: 'CUSTOM_APP_ERROR_HOST_PORT_INVALID' }),
    udp: type('boolean').optional(),
    tcp: type('boolean').optional(),
    interface: type('string').optional(),
  })
    .array()
    .optional(),
  command: type('string | string[]').configure({ message: 'CUSTOM_APP_ERROR_COMMAND_INVALID' }).optional(),
  volumes: type({
    hostPath: type('string').configure({ message: 'CUSTOM_APP_ERROR_HOST_PATH_REQUIRED' }),
    containerPath: type('string').configure({ message: 'CUSTOM_APP_ERROR_CONTAINER_PATH_REQUIRED' }),
    readOnly: type('boolean').optional(),
    shared: type('boolean').optional(),
    private: type('boolean').optional(),
    bind: type({
      propagation: "'rprivate' | 'private' | 'rshared' | 'shared' | 'rslave' | 'slave'",
    }).optional(),
  })
    .array()
    .optional(),
  environment: type({
    key: type('string > 0').configure({ message: 'CUSTOM_APP_ERROR_ENV_KEY_REQUIRED' }),
    value: type('string > 0 | number | boolean').configure({ message: 'CUSTOM_APP_ERROR_ENV_VALUE_REQUIRED' }),
  })
    .array()
    .optional(),
  sysctls: type({ '[string]': type('number').configure({ message: 'CUSTOM_APP_ERROR_SYSCTL_VALUE_INVALID' }) })
    .configure({ message: 'CUSTOM_APP_ERROR_SYSCTL_KEY_INVALID' })
    .optional(),
  healthCheck: type({
    test: type('string').configure({ message: 'CUSTOM_APP_ERROR_HEALTH_CHECK_TEST_REQUIRED' }),
    interval: type('string').optional(),
    timeout: type('string').optional(),
    retries: type('number').configure({ message: 'CUSTOM_APP_ERROR_HEALTH_CHECK_RETRIES_INVALID' }).optional(),
    startInterval: type('string').optional(),
    startPeriod: type('string').optional(),
  }).optional(),
  dependsOn: type
    .or(
      type('string[]').configure({ message: 'CUSTOM_APP_ERROR_DEPENDS_ON_SERVICE_INVALID' }),
      type({
        '[string]': type({
          condition: type("'service_healthy' | 'service_started' | 'service_completed_successfully'").configure({
            message: 'CUSTOM_APP_ERROR_DEPENDS_ON_CONDITION_INVALID',
          }),
        }),
      }),
    )
    .optional(),
  capAdd: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_CAP_ADD_INVALID' }).optional(),
  deploy: type({
    resources: {
      limits: type({
        cpus: type('string').optional(),
        memory: type('string').optional(),
        pids: type('number').configure({ message: 'CUSTOM_APP_ERROR_DEPLOY_PIDS_INVALID' }).optional(),
      }).optional(),
      reservations: type({
        cpus: type('string').optional(),
        memory: type('string').optional(),
        devices: type({
          capabilities: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_DEVICE_CAPABILITY_INVALID' }),
          driver: type('string').optional(),
          count: type("'all' | number").configure({ message: 'CUSTOM_APP_ERROR_DEVICE_COUNT_INVALID' }).optional(),
          deviceIds: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_DEVICE_ID_INVALID' }).optional(),
        }).array(),
      }).optional(),
    },
  }).optional(),
  hostname: type('string').optional(),
  devices: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_DEVICE_INVALID' }).optional(),
  entrypoint: type('string | string[]').configure({ message: 'CUSTOM_APP_ERROR_ENTRYPOINT_INVALID' }).optional(),
  pid: type('string').optional(),
  privileged: type('boolean').optional(),
  tty: type('boolean').optional(),
  user: type('string').optional(),
  workingDir: type('string').optional(),
  shmSize: type('string').optional(),
  capDrop: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_CAP_DROP_INVALID' }).optional(),
  logging: type({
    driver: type('string').configure({ message: 'CUSTOM_APP_ERROR_LOGGING_DRIVER_REQUIRED' }),
    options: type({ '[string]': type('string').configure({ message: 'CUSTOM_APP_ERROR_LOGGING_OPTION_VALUE_INVALID' }) })
      .configure({ message: 'CUSTOM_APP_ERROR_LOGGING_OPTION_KEY_INVALID' })
      .optional(),
  }).optional(),
  readOnly: type('boolean').optional(),
  securityOpt: type('string[]').configure({ message: 'CUSTOM_APP_ERROR_SECURITY_OPT_INVALID' }).optional(),
  stopSignal: type('string').optional(),
  stopGracePeriod: type('string').optional(),
  stdinOpen: type('boolean').optional(),
  extraLabels: type({ '[string]': type('string | boolean').configure({ message: 'CUSTOM_APP_ERROR_LABEL_VALUE_INVALID' }) })
    .configure({ message: 'CUSTOM_APP_ERROR_LABEL_KEY_INVALID' })
    .optional(),
  dns: type('string | string[]').configure({ message: 'CUSTOM_APP_ERROR_DNS_INVALID' }).optional(),
  restart: type("'no' | 'always' | 'on-failure' | 'unless-stopped'").optional(),
});

// dynamicComposeSchemaV2
export const dynamicComposeSchemaArk = type({
  schemaVersion: type.unit(2),
  services: type(serviceSchemaArk).array().moreThanLength(0).configure({ message: 'CUSTOM_APP_ERROR_SERVICES_MIN_LENGTH' }),
  overrides: type({
    architecture: type("'arm64' | 'amd64'").configure({ message: 'CUSTOM_APP_ERROR_ARCHITECTURE_INVALID' }).optional(),
    services: type(serviceSchemaArk).partial().array(),
  })
    .array()
    .optional(),
});
