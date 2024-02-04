import { z } from 'zod';

export const systemLoadSchema = z.object({
  diskUsed: z.number().optional().default(0),
  diskSize: z.number().optional().default(0),
  percentUsed: z.number().optional().default(0),
  cpuLoad: z.number().optional().default(0),
  memoryTotal: z.number().optional().default(0),
  percentUsedMemory: z.number().optional().default(0),
});

export type SystemLoad = z.infer<typeof systemLoadSchema>;
