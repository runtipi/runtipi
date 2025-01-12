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
  nproc: z.number().or(z.object({ soft: z.number(), hard: z.number() })),
  nofile: z.number().or(z.object({ soft: z.number(), hard: z.number() })),
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
  internalPort: z.number().optional(),
  isMain: z.boolean().optional(),
  networkMode: z.string().optional(),
  extraHosts: z.array(z.string()).optional(),
  ulimits: ulimitsSchema.optional(),
  addPorts: z
    .array(
      z.object({
        containerPort: z.number(),
        hostPort: z.number(),
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
      }),
    )
    .optional(),
  environment: z.record(z.union([z.string(), z.number()])).optional(),
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
      options: z.record(z.string()),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  securityOpt: z.array(z.string()).optional(),
  stopSignal: z.string().optional(),
  stopGracePeriod: z.string().optional(),
  stdinOpen: z.boolean().optional(),
});

export const dynamicComposeSchema = z.object({
  services: serviceSchema.array(),
});

export type DependsOn = z.output<typeof dependsOnSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;
