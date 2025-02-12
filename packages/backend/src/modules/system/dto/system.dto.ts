import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Load
export class LoadDto extends createZodDto(
  z.object({
    diskUsed: z.number().nullish().default(0),
    diskSize: z.number().nullish().default(0),
    percentUsed: z.number().nullish().default(0),
    cpuLoad: z.number().nullish().default(0),
    memoryTotal: z.number().nullish().default(0),
    percentUsedMemory: z.number().nullish().default(0),
  }),
) {}

// Update
export class UpdateDto extends createZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}
