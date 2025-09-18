import z from 'zod';
import type { dynamicComposeSchema, serviceSchema } from '../../dynamic-compose.js';

export const serviceSchemaV1 = z.object({
  image: z.string(),
  name: z.string(),
  internalPort: z.number().or(z.string()).optional(),
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
  environment: z.record(z.string().min(1), z.union([z.string().min(1), z.number()])).optional(),
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

export const dynamicComposeSchemaV1 = z.object({
  schemaVersion: z.literal(undefined),
  services: serviceSchemaV1.array(),
  overrides: z
    .array(
      z.object({
        architecture: z.enum(['arm64', 'amd64']).optional(),
        services: serviceSchemaV1.partial().array(),
      }),
    )
    .optional(),
});

const serviceV1ToLatest = (service: Partial<z.infer<typeof serviceSchemaV1>>): z.infer<typeof serviceSchema> => {
  const { environment, internalPort, addPorts, ...rest } = service;

  const newService: Partial<z.infer<typeof serviceSchema>> = { ...rest };

  newService.internalPort = internalPort ? Number(internalPort) : undefined;

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

  return { ...newService } as z.infer<typeof serviceSchema>;
};

const overrideV1ToLatest = (overrides: z.infer<typeof dynamicComposeSchemaV1>['overrides']): z.infer<typeof dynamicComposeSchema>['overrides'] => {
  if (!overrides) return undefined;

  const newOverrides: z.infer<typeof dynamicComposeSchema>['overrides'] = [];

  for (const legacyOverride of overrides) {
    const { architecture, services } = legacyOverride;
    const newServices = services.map(serviceV1ToLatest);
    newOverrides.push({ architecture, services: newServices });
  }

  return newOverrides;
};

export const composeV1ToLatest = (result: z.infer<typeof dynamicComposeSchemaV1>): z.infer<typeof dynamicComposeSchema> => {
  const convertedServices = [];
  let convertedOverrides: z.infer<typeof dynamicComposeSchema>['overrides'];

  for (const service of result.services) {
    convertedServices.push(serviceV1ToLatest(service));
  }

  if (result.overrides) {
    convertedOverrides = overrideV1ToLatest(result.overrides);
  }

  return { schemaVersion: 2, services: convertedServices, overrides: convertedOverrides };
};
