import { z } from 'zod';
import { dynamicComposeSchemaV1 } from './utils/converters/v1.js';

export const serviceSchemaV2 = z.object({
  image: z.string('CUSTOM_APP_ERROR_IMAGE_REQUIRED'),
  name: z.string('CUSTOM_APP_ERROR_NAME_REQUIRED'),
  internalPort: z
    .number('CUSTOM_APP_ERROR_INTERNAL_PORT_INVALID')
    .min(1, 'CUSTOM_APP_ERROR_INTERNAL_PORT_MIN')
    .max(65535, 'CUSTOM_APP_ERROR_INTERNAL_PORT_MAX'),
  isMain: z.boolean().optional(),
  networkMode: z.string().optional(),
  extraHosts: z.array(z.string('CUSTOM_APP_ERROR_EXTRA_HOST_INVALID')).optional(),
  ulimits: z
    .object({
      nproc: z
        .number('CUSTOM_APP_ERROR_ULIMIT_NPROC_INVALID')
        .or(z.object({ soft: z.number('CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID'), hard: z.number('CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID') }))
        .optional(),
      nofile: z
        .number('CUSTOM_APP_ERROR_ULIMIT_NOFILE_INVALID')
        .or(z.object({ soft: z.number('CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID'), hard: z.number('CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID') }))
        .optional(),
      core: z
        .number('CUSTOM_APP_ERROR_ULIMIT_CORE_INVALID')
        .or(z.object({ soft: z.number('CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID'), hard: z.number('CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID') }))
        .optional(),
      memlock: z
        .number('CUSTOM_APP_ERROR_ULIMIT_MEMLOCK_INVALID')
        .or(z.object({ soft: z.number('CUSTOM_APP_ERROR_ULIMIT_SOFT_INVALID'), hard: z.number('CUSTOM_APP_ERROR_ULIMIT_HARD_INVALID') }))
        .optional(),
    })
    .optional(),
  addToMainNetwork: z.boolean().optional(),
  addPorts: z
    .array(
      z.object({
        containerPort: z
          .number('CUSTOM_APP_ERROR_CONTAINER_PORT_INVALID')
          .min(1, 'CUSTOM_APP_ERROR_CONTAINER_PORT_MIN')
          .max(65535, 'CUSTOM_APP_ERROR_CONTAINER_PORT_MAX'),
        hostPort: z
          .number('CUSTOM_APP_ERROR_HOST_PORT_INVALID')
          .min(1, 'CUSTOM_APP_ERROR_HOST_PORT_MIN')
          .max(65535, 'CUSTOM_APP_ERROR_HOST_PORT_MAX'),
        udp: z.boolean().optional(),
        tcp: z.boolean().optional(),
        interface: z.string().optional(),
      }),
    )
    .optional(),
  command: z
    .string()
    .optional()
    .or(z.array(z.string('CUSTOM_APP_ERROR_COMMAND_INVALID')).optional()),
  volumes: z
    .array(
      z.object({
        hostPath: z.string('CUSTOM_APP_ERROR_HOST_PATH_REQUIRED'),
        containerPath: z.string('CUSTOM_APP_ERROR_CONTAINER_PATH_REQUIRED'),
        readOnly: z.boolean().optional(),
        shared: z.boolean().optional(),
        private: z.boolean().optional(),
      }),
    )
    .optional(),
  environment: z
    .array(
      z.object({
        key: z.string('CUSTOM_APP_ERROR_ENV_KEY_REQUIRED').min(1, 'CUSTOM_APP_ERROR_ENV_KEY_MIN_LENGTH'),
        value: z.string('CUSTOM_APP_ERROR_ENV_VALUE_REQUIRED').min(1, 'CUSTOM_APP_ERROR_ENV_VALUE_MIN_LENGTH').or(z.number()).or(z.boolean()),
      }),
    )
    .optional(),
  sysctls: z.record(z.string('CUSTOM_APP_ERROR_SYSCTL_KEY_INVALID'), z.number('CUSTOM_APP_ERROR_SYSCTL_VALUE_INVALID')).optional(),
  healthCheck: z
    .object({
      test: z.string('CUSTOM_APP_ERROR_HEALTH_CHECK_TEST_REQUIRED'),
      interval: z.string().optional(),
      timeout: z.string().optional(),
      retries: z.number('CUSTOM_APP_ERROR_HEALTH_CHECK_RETRIES_INVALID').optional(),
      startInterval: z.string().optional(),
      startPeriod: z.string().optional(),
    })
    .optional(),
  dependsOn: z
    .union([
      z.array(z.string('CUSTOM_APP_ERROR_DEPENDS_ON_SERVICE_INVALID')),
      z.record(
        z.string('CUSTOM_APP_ERROR_DEPENDS_ON_SERVICE_INVALID'),
        z.object({
          condition: z.enum(
            ['service_healthy', 'service_started', 'service_completed_successfully'],
            'CUSTOM_APP_ERROR_DEPENDS_ON_CONDITION_INVALID',
          ),
        }),
      ),
    ])
    .optional(),
  capAdd: z.array(z.string('CUSTOM_APP_ERROR_CAP_ADD_INVALID')).optional(),
  deploy: z
    .object({
      resources: z.object({
        limits: z
          .object({
            cpus: z.string().optional(),
            memory: z.string().optional(),
            pids: z.number('CUSTOM_APP_ERROR_DEPLOY_PIDS_INVALID').optional(),
          })
          .optional(),
        reservations: z
          .object({
            cpus: z.string().optional(),
            memory: z.string().optional(),
            devices: z
              .object({
                capabilities: z.array(z.string('CUSTOM_APP_ERROR_DEVICE_CAPABILITY_INVALID')),
                driver: z.string().optional(),
                count: z.enum(['all'], 'CUSTOM_APP_ERROR_DEVICE_COUNT_INVALID').or(z.number('CUSTOM_APP_ERROR_DEVICE_COUNT_INVALID')).optional(),
                deviceIds: z.array(z.string('CUSTOM_APP_ERROR_DEVICE_ID_INVALID')).optional(),
              })
              .array(),
          })
          .optional(),
      }),
    })
    .optional(),
  hostname: z.string().optional(),
  devices: z.array(z.string('CUSTOM_APP_ERROR_DEVICE_INVALID')).optional(),
  entrypoint: z
    .string()
    .or(z.array(z.string('CUSTOM_APP_ERROR_ENTRYPOINT_INVALID')))
    .optional(),
  pid: z.string().optional(),
  privileged: z.boolean().optional(),
  tty: z.boolean().optional(),
  user: z.string().optional(),
  workingDir: z.string().optional(),
  shmSize: z.string().optional(),
  capDrop: z.array(z.string('CUSTOM_APP_ERROR_CAP_DROP_INVALID')).optional(),
  logging: z
    .object({
      driver: z.string('CUSTOM_APP_ERROR_LOGGING_DRIVER_REQUIRED'),
      options: z
        .record(z.string('CUSTOM_APP_ERROR_LOGGING_OPTION_KEY_INVALID'), z.string('CUSTOM_APP_ERROR_LOGGING_OPTION_VALUE_INVALID'))
        .optional(),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  securityOpt: z.array(z.string('CUSTOM_APP_ERROR_SECURITY_OPT_INVALID')).optional(),
  stopSignal: z.string().optional(),
  stopGracePeriod: z.string().optional(),
  stdinOpen: z.boolean().optional(),
  extraLabels: z.record(z.string('CUSTOM_APP_ERROR_LABEL_KEY_INVALID'), z.string().or(z.boolean())).optional(),
  dns: z
    .string()
    .optional()
    .or(z.array(z.string('CUSTOM_APP_ERROR_DNS_INVALID')).optional()),
});

export const dynamicComposeSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  services: serviceSchemaV2.array().min(1, 'CUSTOM_APP_ERROR_SERVICES_MIN_LENGTH'),
  overrides: z
    .array(
      z.object({
        architecture: z.enum(['arm64', 'amd64'], 'CUSTOM_APP_ERROR_ARCHITECTURE_INVALID').optional(),
        services: serviceSchemaV2.partial().array(),
      }),
    )
    .optional(),
});

export const dynamicComposeUnion = z.discriminatedUnion('schemaVersion', [dynamicComposeSchemaV1, dynamicComposeSchemaV2]);

// Change when introducing breaking changes
export const serviceSchema = serviceSchemaV2;
export const dynamicComposeSchema = dynamicComposeSchemaV2;

export type DynamicCompose = z.output<typeof dynamicComposeSchema>;
export type DependsOn = z.output<typeof serviceSchemaV2.shape.dependsOn>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;
