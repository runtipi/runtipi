import { z } from 'zod';
import { dynamicComposeSchemaV1 } from './utils/converters/v1.js';

export const serviceSchemaV2 = z.object({
  image: z.string(),
  name: z.string(),
  internalPort: z.number().min(1).max(65535),
  isMain: z.boolean().optional(),
  networkMode: z.string().optional(),
  extraHosts: z.array(z.string()).optional(),
  ulimits: z
    .object({
      nproc: z
        .number()
        .or(z.object({ soft: z.number(), hard: z.number() }))
        .optional(),
      nofile: z
        .number()
        .or(z.object({ soft: z.number(), hard: z.number() }))
        .optional(),
      core: z
        .number()
        .or(z.object({ soft: z.number(), hard: z.number() }))
        .optional(),
      memlock: z
        .number()
        .or(z.object({ soft: z.number(), hard: z.number() }))
        .optional(),
    })
    .optional(),
  addToMainNetwork: z.boolean().optional(),
  addPorts: z
    .array(
      z.object({
        containerPort: z.number().min(1).max(65535),
        hostPort: z.number().min(1).max(65535),
        udp: z.boolean().optional(),
        tcp: z.boolean().optional(),
        interface: z.string().optional(),
      }),
    )
    .optional(),
  command: z.string().optional().or(z.array(z.string()).optional()),
  volumes: z
    .array(
      z.object({
        hostPath: z.string(),
        containerPath: z.string(),
        readOnly: z.boolean().optional(),
        shared: z.boolean().optional(),
        private: z.boolean().optional(),
      }),
    )
    .optional(),
  environment: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1).or(z.number()).or(z.boolean()),
      }),
    )
    .optional(),
  sysctls: z.record(z.string(), z.number()).optional(),
  healthCheck: z
    .object({
      test: z.string(),
      interval: z.string().optional(),
      timeout: z.string().optional(),
      retries: z.number().optional(),
      startInterval: z.string().optional(),
      startPeriod: z.string().optional(),
    })
    .optional(),
  dependsOn: z
    .union([
      z.array(z.string()),
      z.record(
        z.string(),
        z.object({
          condition: z.enum(['service_healthy', 'service_started', 'service_completed_successfully']),
        }),
      ),
    ])
    .optional(),
  capAdd: z.array(z.string()).optional(),
  deploy: z
    .object({
      resources: z.object({
        limits: z
          .object({
            cpus: z.string().optional(),
            memory: z.string().optional(),
            pids: z.number().optional(),
          })
          .optional(),
        reservations: z
          .object({
            cpus: z.string().optional(),
            memory: z.string().optional(),
            devices: z
              .object({
                capabilities: z.array(z.string()),
                driver: z.string().optional(),
                count: z.enum(['all']).or(z.number()).optional(),
                deviceIds: z.array(z.string()).optional(),
              })
              .array(),
          })
          .optional(),
      }),
    })
    .optional(),
  hostname: z.string().optional(),
  devices: z.array(z.string()).optional(),
  entrypoint: z.string().or(z.array(z.string())).optional(),
  pid: z.string().optional(),
  privileged: z.boolean().optional(),
  tty: z.boolean().optional(),
  user: z.string().optional(),
  workingDir: z.string().optional(),
  shmSize: z.string().optional(),
  capDrop: z.array(z.string()).optional(),
  logging: z
    .object({
      driver: z.string(),
      options: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  securityOpt: z.array(z.string()).optional(),
  stopSignal: z.string().optional(),
  stopGracePeriod: z.string().optional(),
  stdinOpen: z.boolean().optional(),
  extraLabels: z.record(z.string(), z.string().or(z.boolean())).optional(),
  dns: z.string().optional().or(z.array(z.string()).optional()),
});

export const dynamicComposeSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  services: serviceSchemaV2.array(),
  overrides: z
    .array(
      z.object({
        architecture: z.enum(['arm64', 'amd64']).optional(),
        services: serviceSchemaV2.partial().array(),
      }),
    )
    .optional(),
});

export const dynamicComposeUnion = z.discriminatedUnion('schemaVersion', [dynamicComposeSchemaV1, dynamicComposeSchemaV2]);

// Change when introducing breaking changes
export const serviceSchema = serviceSchemaV2;
export const dynamicComposeSchema = dynamicComposeSchemaV2.omit({ schemaVersion: true });

export type DynamicCompose = z.output<typeof dynamicComposeSchema>;
export type DependsOn = z.output<typeof serviceSchemaV2.shape.dependsOn>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;
