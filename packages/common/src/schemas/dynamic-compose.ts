import { z } from 'zod';

const dependsOnSchema = z.union([
  z.array(z.string()),
  z.record(
    z.string(),
    z.object({
      condition: z.enum(['service_healthy', 'service_started', 'service_completed_successfully']),
    }),
  ),
]);

const ulimitsSchema = z.object({
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
});

const deploySchema = z.object({
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
});

export const serviceSchema = z.object({
  image: z.string(),
  name: z.string(),
  internalPort: z.number().or(z.string()).optional(),
  isMain: z.boolean().optional(),
  networkMode: z.string().optional(),
  extraHosts: z.array(z.string()).optional(),
  ulimits: ulimitsSchema.optional(),
  addToMainNetwork: z.boolean().optional(),
  addPorts: z
    .array(
      z.object({
        containerPort: z.number().or(z.string()),
        hostPort: z.number().or(z.string()),
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
  environment: z.record(z.union([z.string(), z.number()])).optional(),
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
  dependsOn: dependsOnSchema.optional(),
  capAdd: z.array(z.string()).optional(),
  deploy: deploySchema.optional(),
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
      options: z.record(z.string()).optional(),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  securityOpt: z.array(z.string()).optional(),
  stopSignal: z.string().optional(),
  stopGracePeriod: z.string().optional(),
  stdinOpen: z.boolean().optional(),
  extraLabels: z.record(z.string().or(z.boolean())).optional(),
});

export const dynamicComposeSchema = z.object({
  services: serviceSchema.array(),
  overrides: z
    .array(
      z.object({
        architecture: z.enum(['arm64', 'amd64']).optional(),
        services: serviceSchema.partial().array(),
      }),
    )
    .optional(),
});

export type DynamicCompose = z.output<typeof dynamicComposeSchema>;
export type DependsOn = z.output<typeof dependsOnSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;
