import { z } from 'zod';

export const systemLoadSchema = z.object({
  diskUsed: z.number().nullish().default(0),
  diskSize: z.number().nullish().default(0),
  percentUsed: z.number().nullish().default(0),
  cpuLoad: z.number().nullish().default(0),
  memoryTotal: z.number().nullish().default(0),
  percentUsedMemory: z.number().nullish().default(0),
});

export type SystemLoad = z.output<typeof systemLoadSchema>;
