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

export const serviceSchema = z.object({
  image: z.string(),
  name: z.string(),
  internalPort: z.number(),
  isMain: z.boolean().optional(),
  addPorts: z
    .array(
      z.object({
        containerPort: z.number(),
        hostPort: z.number(),
        udp: z.boolean().optional(),
        tcp: z.boolean().optional(),
      }),
    )
    .optional(),
  command: z.string().optional(),
  volumes: z
    .array(
      z.object({
        hostPath: z.string(),
        containerPath: z.string(),
        readOnly: z.boolean().optional(),
      }),
    )
    .optional(),
  environment: z.record(z.string()).optional(),
  healthCheck: z
    .object({
      test: z.string(),
      interval: z.string(),
      timeout: z.string(),
      retries: z.number(),
    })
    .optional(),
  dependsOn: dependsOnSchema.optional(),
});

export type DependsOn = z.output<typeof dependsOnSchema>;
